#!/usr/bin/env python3
"""
Database cleanup script to fix corrupted itinerary data
Run this script to clean up any invalid itinerary data in the database
"""

import sys
import logging
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_corrupted_itineraries():
    """Fix any corrupted itinerary data in the database"""
    db = SessionLocal()
    fixed_count = 0
    error_count = 0
    
    try:
        # Get all trips
        trips = db.query(models.DBTrip).all()
        logger.info(f"Found {len(trips)} trips to check")
        
        for trip in trips:
            try:
                # Check if itinerary is valid
                if trip.itinerary is None:
                    # Set default pending status
                    trip.itinerary = {"status": "pending", "activities": []}
                    fixed_count += 1
                    logger.info(f"Fixed trip {trip.id}: Set default itinerary")
                
                elif not isinstance(trip.itinerary, dict):
                    # Fix invalid itinerary data
                    logger.warning(f"Trip {trip.id} has invalid itinerary: {trip.itinerary}")
                    
                    # Check if it's an error response format [422, {...}]
                    if isinstance(trip.itinerary, (list, tuple)) and len(trip.itinerary) == 2:
                        trip.itinerary = {
                            "status": "error", 
                            "activities": [], 
                            "error": "Previous generation failed"
                        }
                    else:
                        trip.itinerary = {
                            "status": "error", 
                            "activities": [], 
                            "error": "Corrupted data recovered"
                        }
                    
                    fixed_count += 1
                    logger.info(f"Fixed trip {trip.id}: Corrected invalid itinerary format")
                
                elif isinstance(trip.itinerary, dict):
                    # Validate dict structure
                    if "status" not in trip.itinerary:
                        trip.itinerary["status"] = "completed"
                        fixed_count += 1
                        logger.info(f"Fixed trip {trip.id}: Added missing status field")
                    
                    if "activities" not in trip.itinerary:
                        trip.itinerary["activities"] = []
                        fixed_count += 1
                        logger.info(f"Fixed trip {trip.id}: Added missing activities field")
                
            except Exception as e:
                logger.error(f"Error processing trip {trip.id}: {str(e)}")
                error_count += 1
                # Set a safe default
                trip.itinerary = {
                    "status": "error", 
                    "activities": [], 
                    "error": f"Recovery failed: {str(e)}"
                }
                fixed_count += 1
        
        # Commit all changes
        if fixed_count > 0:
            db.commit()
            logger.info(f"Successfully fixed {fixed_count} trips")
        else:
            logger.info("No trips needed fixing")
            
        if error_count > 0:
            logger.warning(f"Encountered {error_count} errors during processing")
            
    except Exception as e:
        logger.error(f"Database operation failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()
    
    return fixed_count, error_count

def verify_database_integrity():
    """Verify that all trips have valid itinerary data"""
    db = SessionLocal()
    try:
        trips = db.query(models.DBTrip).all()
        invalid_count = 0
        
        for trip in trips:
            if trip.itinerary is not None and not isinstance(trip.itinerary, dict):
                logger.warning(f"Trip {trip.id} still has invalid itinerary: {trip.itinerary}")
                invalid_count += 1
            elif isinstance(trip.itinerary, dict):
                # Check required fields
                if "status" not in trip.itinerary or "activities" not in trip.itinerary:
                    logger.warning(f"Trip {trip.id} missing required itinerary fields")
                    invalid_count += 1
        
        if invalid_count == 0:
            logger.info("Database integrity check passed - all itineraries are valid")
        else:
            logger.warning(f"Database integrity check found {invalid_count} issues")
            
        return invalid_count == 0
        
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Starting database cleanup...")
    
    try:
        # First, fix corrupted data
        fixed, errors = fix_corrupted_itineraries()
        
        # Then verify integrity
        is_valid = verify_database_integrity()
        
        if is_valid and errors == 0:
            logger.info("Database cleanup completed successfully!")
            sys.exit(0)
        else:
            logger.warning("Database cleanup completed with some issues")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Database cleanup failed: {str(e)}")
        sys.exit(1)