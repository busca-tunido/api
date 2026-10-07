if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {}
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('postgresql:')) {
  process.env.DATABASE_URL =
    process.env.MONGODB_URI_TEST ||
    'mongodb+srv://emailjoseleiva_db_user:PX4TulkShfd038vL@busca-tunido.yevktbz.mongodb.net/buscatunido_test?retryWrites=true&w=majority';
}
