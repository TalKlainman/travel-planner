import sqlite3
import psycopg2
from psycopg2 import OperationalError
import os
import json
import time

# Database connection parameters
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'postgres-service')
POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'postgres')
POSTGRES_DB = os.getenv('POSTGRES_DB', 'traveldb')

# SQLite database path
SQLITE_DB_PATH = 'travel_planner.db'

def wait_for_postgres(max_retries=30, delay=2):
    """Wait for PostgreSQL to be ready with retry logic."""
    print("Waiting for PostgreSQL to be ready...")
    
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                dbname=POSTGRES_DB
            )
            conn.close()
            print("✅ PostgreSQL is ready!")
            return True
            
        except OperationalError as e:
            print(f"⏳ Attempt {attempt + 1}/{max_retries}: PostgreSQL not ready yet...")
            print(f"   Error: {str(e).strip()}")
            
            if attempt < max_retries - 1:  # Don't sleep on the last attempt
                print(f"   Waiting {delay} seconds before retry...")
                time.sleep(delay)
            else:
                print("❌ PostgreSQL failed to start within the expected time")
                raise Exception(f"PostgreSQL failed to start after {max_retries * delay} seconds")
    
    return False

def create_tables_manually():
    """Create tables in PostgreSQL with explicit schema."""
    print("\n🔧 Creating database tables...")
    
    # Wait for PostgreSQL to be ready first
    wait_for_postgres()
    
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB
    )
    cursor = conn.cursor()
    
    # Check if tables already exist
    cursor.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users';
    """)
    tables_exist = cursor.fetchone()
    
    if tables_exist:
        print("✅ Tables already exist, skipping table creation")
        conn.close()
        return
    
    print("🔧 Creating tables for the first time...")
    
    # Create users table
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            hashed_password TEXT NOT NULL,
            is_active BOOLEAN NOT NULL
        );
        """)
        print("✅ Created table: users")
    except Exception as e:
        print(f"❌ Error creating users table: {str(e)}")
    
    # Create locations table
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS locations (
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
        print("✅ Created table: locations")
    except Exception as e:
        print(f"❌ Error creating locations table: {str(e)}")
    
    # Create trips table
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS trips (
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
        print("✅ Created table: trips")
    except Exception as e:
        print(f"❌ Error creating trips table: {str(e)}")
    
    # Create preferences table
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS preferences (
            id SERIAL PRIMARY KEY,
            category TEXT NOT NULL,
            value TEXT NOT NULL,
            weight INTEGER NOT NULL,
            user_id INTEGER NOT NULL
        );
        """)
        print("✅ Created table: preferences")
    except Exception as e:
        print(f"❌ Error creating preferences table: {str(e)}")
    
    conn.commit()
    conn.close()
    print("🎉 Database schema created successfully!")

def insert_data_manually():
    """Insert data from SQLite to PostgreSQL manually."""
    print("\n📊 Starting data migration...")
    
    # Connect to PostgreSQL first to check existing data
    wait_for_postgres()
    pg_conn = psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB
    )
    pg_cursor = pg_conn.cursor()
    
    # Check if data already exists
    try:
        pg_cursor.execute("SELECT COUNT(*) FROM trips;")
        trip_count = pg_cursor.fetchone()[0]
        
        pg_cursor.execute("SELECT COUNT(*) FROM users;")
        user_count = pg_cursor.fetchone()[0]
        
        pg_cursor.execute("SELECT COUNT(*) FROM preferences;")
        pref_count = pg_cursor.fetchone()[0]
        
        pg_cursor.execute("SELECT COUNT(*) FROM locations;")
        location_count = pg_cursor.fetchone()[0]
        
        if trip_count > 0 or user_count > 0 or pref_count > 0 or location_count > 0:
            print(f"✅ Database already contains data:")
            print(f"   - Users: {user_count}")
            print(f"   - Trips: {trip_count}")
            print(f"   - Preferences: {pref_count}")
            print(f"   - Locations: {location_count}")
            print("🔄 Skipping data migration to prevent duplicates")
            pg_conn.close()
            return
            
    except Exception as e:
        print(f"⚠️  Error checking existing data: {str(e)}")
        # Continue with migration if we can't check existing data
    
    # Check if SQLite database exists
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"⚠️  SQLite database not found at {SQLITE_DB_PATH}")
        print("🔄 Skipping data migration - starting with empty database")
        pg_conn.close()
        return
    
    print("🔄 Database is empty, proceeding with migration...")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_cursor = sqlite_conn.cursor()
    
    # 1. Migrate users
    print("👤 Migrating users...")
    try:
        sqlite_cursor.execute("SELECT email, hashed_password, is_active FROM users;")
        users = sqlite_cursor.fetchall()
        
        migrated_user_count = 0
        for user in users:
            email, hashed_password, is_active = user
            try:
                # Check if user already exists
                pg_cursor.execute("SELECT id FROM users WHERE email = %s;", (email,))
                existing_user = pg_cursor.fetchone()
                
                if existing_user:
                    print(f"   ⚠️  User {email} already exists, skipping...")
                    continue
                
                pg_cursor.execute("""
                INSERT INTO users (email, hashed_password, is_active)
                VALUES (%s, %s, %s)
                RETURNING id;
                """, (email, hashed_password, True if is_active == 1 else False))
                
                user_id = pg_cursor.fetchone()[0]
                print(f"   ✅ Migrated user: {email}")
                migrated_user_count += 1
                pg_conn.commit()
            except Exception as e:
                pg_conn.rollback()
                print(f"   ❌ Error migrating user {email}: {str(e)}")
        
        print(f"👤 Users migrated: {migrated_user_count}/{len(users)}")
        
    except Exception as e:
        print(f"⚠️  Error accessing users table: {str(e)}")
    
    # 2. Migrate locations
    print("📍 Migrating locations...")
    try:
        sqlite_cursor.execute("SELECT name, country, description, lat, lng, popular, image_url FROM locations;")
        locations = sqlite_cursor.fetchall()
        
        migrated_location_count = 0
        for location in locations:
            name, country, description, lat, lng, popular, image_url = location
            try:
                # Check if location already exists
                pg_cursor.execute("SELECT id FROM locations WHERE name = %s AND country = %s;", (name, country))
                existing_location = pg_cursor.fetchone()
                
                if existing_location:
                    print(f"   ⚠️  Location {name}, {country} already exists, skipping...")
                    continue
                
                pg_cursor.execute("""
                INSERT INTO locations (name, country, description, lat, lng, popular, image_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """, (name, country, description, lat, lng, True if popular == 1 else False, image_url))
                
                location_id = pg_cursor.fetchone()[0]
                print(f"   ✅ Migrated location: {name}")
                migrated_location_count += 1
                pg_conn.commit()
            except Exception as e:
                pg_conn.rollback()
                print(f"   ❌ Error migrating location {name}: {str(e)}")
        
        print(f"📍 Locations migrated: {migrated_location_count}/{len(locations)}")
        
    except Exception as e:
        print(f"⚠️  Error accessing locations table: {str(e)}")
    
    # 3. Migrate trips
    print("🧳 Migrating trips...")
    try:
        sqlite_cursor.execute("SELECT title, destination, start_date, end_date, budget, description, itinerary, owner_id FROM trips;")
        trips = sqlite_cursor.fetchall()
        
        migrated_trip_count = 0
        for trip in trips:
            title, destination, start_date, end_date, budget, description, itinerary, owner_id = trip
            try:
                # Check if trip already exists
                pg_cursor.execute("""
                    SELECT id FROM trips 
                    WHERE title = %s AND destination = %s AND start_date = %s;
                """, (title, destination, start_date))
                existing_trip = pg_cursor.fetchone()
                
                if existing_trip:
                    print(f"   ⚠️  Trip {title} to {destination} already exists, skipping...")
                    continue
                
                # Handle itinerary JSON
                if itinerary:
                    try:
                        if isinstance(itinerary, str):
                            itinerary_json = json.loads(itinerary)
                        else:
                            itinerary_json = itinerary
                        itinerary = json.dumps(itinerary_json)
                    except:
                        itinerary = '{}'
                else:
                    itinerary = '{}'
                
                pg_cursor.execute("""
                INSERT INTO trips (title, destination, start_date, end_date, budget, description, itinerary, owner_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                RETURNING id;
                """, (title, destination, start_date, end_date, budget, description, itinerary, 1))
                
                trip_id = pg_cursor.fetchone()[0]
                print(f"   ✅ Migrated trip: {title}")
                migrated_trip_count += 1
                pg_conn.commit()
            except Exception as e:
                pg_conn.rollback()
                print(f"   ❌ Error migrating trip {title}: {str(e)}")
        
        print(f"🧳 Trips migrated: {migrated_trip_count}/{len(trips)}")
        
    except Exception as e:
        print(f"⚠️  Error accessing trips table: {str(e)}")
    
    # 4. Migrate preferences
    print("⚙️  Migrating preferences...")
    try:
        sqlite_cursor.execute("SELECT category, value, weight, user_id FROM preferences;")
        preferences = sqlite_cursor.fetchall()
        
        migrated_pref_count = 0
        for pref in preferences:
            category, value, weight, user_id = pref
            try:
                # Check if preference already exists
                pg_cursor.execute("""
                    SELECT id FROM preferences 
                    WHERE category = %s AND value = %s AND user_id = %s;
                """, (category, value, 1))  # Using user_id = 1 as in original code
                existing_pref = pg_cursor.fetchone()
                
                if existing_pref:
                    print(f"   ⚠️  Preference {category}: {value} already exists, skipping...")
                    continue
                
                pg_cursor.execute("""
                INSERT INTO preferences (category, value, weight, user_id)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """, (category, value, weight, 1))
                
                pref_id = pg_cursor.fetchone()[0]
                print(f"   ✅ Migrated preference: {category}: {value}")
                migrated_pref_count += 1
                pg_conn.commit()
            except Exception as e:
                pg_conn.rollback()
                print(f"   ❌ Error migrating preference {category}: {value}: {str(e)}")
        
        print(f"⚙️  Preferences migrated: {migrated_pref_count}/{len(preferences)}")
        
    except Exception as e:
        print(f"⚠️  Error accessing preferences table: {str(e)}")
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()
    print("🎉 Data migration completed!")

def main():
    """Main migration function."""
    print("🚀 Starting migration from SQLite to PostgreSQL...")
    print("=" * 50)
    
    try:
        # Create tables with fresh schema (only if they don't exist)
        create_tables_manually()
        
        # Insert data manually (only if database is empty)
        insert_data_manually()
        
        print("\n" + "=" * 50)
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        print("Please check the error messages above and try again.")
        exit(1)

if __name__ == "__main__":
    main()