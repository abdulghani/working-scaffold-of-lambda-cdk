#!/bin/bash

# SET TIMEZONE
export TZ=Asia/Jakarta

# VARIABLES
CURRENT_DATE="$(date --iso-8601=seconds)"
BACKUP_DIR_PATH="/path/to/dir"
AWS_PROFILE="profile-name"
S3_BUCKET_NAME="bucket-name"

PG_HOST="host-name"
PG_USER="user-name"
PG_DB="db-name"
PG_PASS="password"

BACKUP_FILE="$BACKUP_DIR_PATH/pg-backup.tar"

create_pg_backup() {
  export PGPASSWORD="$PG_PASS" # set password for pg_dump
  pg_dump --host "$PG_HOST" --username "$PG_USER" --dbname "$PG_DB" --format t --blobs --verbose --file "$BACKUP_FILE"
  unset PGPASSWORD
}

upload_backup_to_s3() {
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET_NAME/$PG_HOST-$CURRENT_DATE.tar" \
    --profile "$AWS_PROFILE"
  rm -rf "$BACKUP_FILE"
}

create_pg_backup
upload_backup_to_s3
