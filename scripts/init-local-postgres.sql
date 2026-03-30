-- Mac’te yerel PostgreSQL (süper kullanıcı ile bir kez çalıştırın):
--   psql -U postgres -h 127.0.0.1 -p 5432 -d postgres -f scripts/init-local-postgres.sql
-- Süper kullanıcı adınız farklıysa (ör. macOS kullanıcı adınız): -U emincanyoldas

CREATE USER ecychat WITH PASSWORD 'ecychat';
CREATE DATABASE ecychat OWNER ecychat;
GRANT ALL PRIVILEGES ON DATABASE ecychat TO ecychat;
