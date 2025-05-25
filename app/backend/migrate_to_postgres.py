import sqlite3
import psycopg2
import os
import json

# Database connection parameters
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'postgres-service')
POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'postgres')
POSTGRES_DB = os.getenv('POSTGRES_DB', 'traveldb')

# SQLite database path
SQLITE_DB_PATH = 'travel_planner.db'

def create_tables_manually():
    """Create tables in PostgreSQL with explicit schema."""
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB
    )
    cursor = conn.cursor()
    
    # Drop existing tables
    try:
        cursor.execute("DROP TABLE IF EXISTS users, locations, trips, preferences CASCADE;")
        print("Dropped existing tables")
    except Exception as e:
        print(f"Error dropping tables: {str(e)}")
    
    # Create users table
    try:
        cursor.execute("""
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            hashed_password TEXT NOT NULL,
            is_active BOOLEAN NOT NULL
        );
        """)
        print("Created table: users")
    except Exception as e:
        print(f"Error creating users table: {str(e)}")
    
    # Create locations table
    try:
        cursor.execute("""
        CREATE TABLE locations (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            country TEXT NOT NULL,
            description TEXT,
            lat FLOAT NOT NULL,
            lng FLOAT NOT NULL,
            popular BOOLEAN DEFAULT FALSE,
            image_url TEXT
        );
        """)
        print("Created table: locations")
    except Exception as e:
        print(f"Error creating locations table: {str(e)}")
    
    # Create trips table
    try:
        cursor.execute("""
        CREATE TABLE trips (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            destination TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            budget FLOAT,
            description TEXT,
            itinerary JSONB,
            owner_id INTEGER NOT NULL
        );
        """)
        print("Created table: trips")
    except Exception as e:
        print(f"Error creating trips table: {str(e)}")
    
    # Create preferences table
    try:
        cursor.execute("""
        CREATE TABLE preferences (
            id SERIAL PRIMARY KEY,
            category TEXT NOT NULL,
            value TEXT NOT NULL,
            weight INTEGER NOT NULL,
            user_id INTEGER NOT NULL
        );
        """)
        print("Created table: preferences")
    except Exception as e:
        print(f"Error creating preferences table: {str(e)}")
    
    conn.commit()
    conn.close()

def insert_data_manually():
    """Insert data from SQLite to PostgreSQL manually."""
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB
    )
    pg_cursor = pg_conn.cursor()
    
    # 1. Migrate users
    sqlite_cursor.execute("SELECT email, hashed_password, is_active FROM users;")
    users = sqlite_cursor.fetchall()
    
    for user in users:
        email, hashed_password, is_active = user
        try:
            pg_cursor.execute("""
            INSERT INTO users (email, hashed_password, is_active)
            VALUES (%s, %s, %s)
            RETURNING id;
            """, (email, hashed_password, True if is_active == 1 else False))
            
            # Get the new ID to use for references
            user_id = pg_cursor.fetchone()[0]
            print(f"Migrated user {email} with new ID {user_id}")
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            print(f"Error migrating user {email}: {str(e)}")
    
    # 2. Migrate locations
    sqlite_cursor.execute("SELECT name, country, description, lat, lng, popular, image_url FROM locations;")
    locations = sqlite_cursor.fetchall()
    
    for location in locations:
        name, country, description, lat, lng, popular, image_url = location
        try:
            pg_cursor.execute("""
            INSERT INTO locations (name, country, description, lat, lng, popular, image_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """, (name, country, description, lat, lng, True if popular == 1 else False, image_url))
            
            location_id = pg_cursor.fetchone()[0]
            print(f"Migrated location {name} with new ID {location_id}")
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            print(f"Error migrating location {name}: {str(e)}")
    
    # 3. Migrate trips
    sqlite_cursor.execute("SELECT title, destination, start_date, end_date, budget, description, itinerary, owner_id FROM trips;")
    trips = sqlite_cursor.fetchall()
    
    for trip in trips:
        title, destination, start_date, end_date, budget, description, itinerary, owner_id = trip
        try:
            # Handle itinerary JSON
            if itinerary:
                try:
                    # If it's a string, parse it
                    if isinstance(itinerary, str):
                        itinerary_json = json.loads(itinerary)
                    else:
                        itinerary_json = itinerary
                    
                    # Convert to JSON string for PostgreSQL
                    itinerary = json.dumps(itinerary_json)
                except:
                    # If parsing fails, set to empty JSON object
                    itinerary = '{}'
            else:
                itinerary = '{}'
            
            pg_cursor.execute("""
            INSERT INTO trips (title, destination, start_date, end_date, budget, description, itinerary, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
            RETURNING id;
            """, (title, destination, start_date, end_date, budget, description, itinerary, 1))  # Use ID 1 for now
            
            trip_id = pg_cursor.fetchone()[0]
            print(f"Migrated trip {title} with new ID {trip_id}")
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            print(f"Error migrating trip {title}: {str(e)}")
    
    # 4. Migrate preferences
    sqlite_cursor.execute("SELECT category, value, weight, user_id FROM preferences;")
    preferences = sqlite_cursor.fetchall()
    
    for pref in preferences:
        category, value, weight, user_id = pref
        try:
            pg_cursor.execute("""
            INSERT INTO preferences (category, value, weight, user_id)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
            """, (category, value, weight, 1))  # Use ID 1 for now
            
            pref_id = pg_cursor.fetchone()[0]
            print(f"Migrated preference {category}: {value} with new ID {pref_id}")
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            print(f"Error migrating preference {category}: {value}: {str(e)}")
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()

def main():
    """Main migration function."""
    print("Starting migration from SQLite to PostgreSQL...")
    
    # Create tables with fresh schema
    create_tables_manually()
    
    # Insert data manually
    insert_data_manually()
    
    print("Migration completed!")

if __name__ == "__main__":
    main()