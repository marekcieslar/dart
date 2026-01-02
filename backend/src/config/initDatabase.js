import db, { run } from './database.js';

const initDatabase = async () => {
  try {
    console.log('Initializing database schema...');

    // Create games table
    await run(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        type INTEGER NOT NULL,
        best_of INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        admin_token TEXT NOT NULL
      )
    `);
    console.log('✓ Table "games" created');

    // Create game_players table
    await run(`
      CREATE TABLE IF NOT EXISTS game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        player_order INTEGER NOT NULL,
        legs_won INTEGER DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Table "game_players" created');

    // Create legs table
    await run(`
      CREATE TABLE IF NOT EXISTS legs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        leg_number INTEGER NOT NULL,
        winner_id INTEGER,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES game_players(id)
      )
    `);
    console.log('✓ Table "legs" created');

    // Create turns table
    await run(`
      CREATE TABLE IF NOT EXISTS turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        leg_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        turn_number INTEGER NOT NULL,
        dart1_score INTEGER,
        dart1_multiplier INTEGER,
        dart2_score INTEGER,
        dart2_multiplier INTEGER,
        dart3_score INTEGER,
        dart3_multiplier INTEGER,
        total_score INTEGER,
        remaining_before INTEGER,
        remaining_after INTEGER,
        is_bust BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leg_id) REFERENCES legs(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES game_players(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Table "turns" created');

    // Create admin_tokens table
    await run(`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Table "admin_tokens" created');

    // Create indexes
    await run('CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_legs_game ON legs(game_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_turns_leg ON turns(leg_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_admin_tokens_game ON admin_tokens(game_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_admin_tokens_token ON admin_tokens(token)');
    console.log('✓ Indexes created');

    console.log('\n✅ Database schema initialized successfully!');
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
};

initDatabase();
