export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://stacklane:stacklane@localhost:5432/stacklane',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000'
}
