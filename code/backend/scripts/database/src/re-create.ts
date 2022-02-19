import { exec } from 'child_process';
import dotenv from 'dotenv';
import { getMostRecentFile } from '../utils';
import path from 'path';
dotenv.config();


const USERNAME = process.env.BADMAN_USERNAME || 'postgres';
const PASSWORD = process.env.BADMAN_PASSWORD || 'postgres';
const DATABASE = process.env.BADMAN_DATABASE || 'ranking';
const HOST = process.env.BADMAN_HOST || 'localhost';
const PORT = process.env.BADMAN_PORT || 5433;

const BACKUPLOC = process.env.BADMAN_BACKUPLOC || 'backups';
const PSQL = process.env.PSQL || 'C:\\Program Files\\PostgreSQL\\13\\bin';

const runCommmand = (cmd: string) => {
  let query = ``;
  query += `set PGPASSWORD=${PASSWORD}&`;
  query += `set PGHOST=${HOST}&`;
  query += `set PGPORT=${PORT}&`;
  query += `set PGUSER=${USERNAME}&`;

  query += `${cmd}`;

  console.log(`----- Running: ${query} ----`);
  return new Promise((res, rej) => {
    const migrate = exec(query, { env: process.env }, (err) => {
      return err ? rej(err) : res('ok');
    });
    // Forward stdout+stderr to this process
    migrate.stdout.pipe(process.stdout);
    migrate.stderr.pipe(process.stderr);
  });
};


(async () => {
  try {
    console.log('----- Dropping database ----');
    await runCommmand(`"${PSQL}\\dropdb" --if-exists -e -f ${DATABASE}`);

    console.log('----- Creating database ----');
    await runCommmand(`"${PSQL}\\createdb" -e ${DATABASE}`);

    const lastFile = getMostRecentFile(BACKUPLOC);
    console.log(`----- Restoring ${lastFile.file} ----`);
    await runCommmand(
      `"${PSQL}\\pg_restore" -d ${DATABASE} ${path.join(
        BACKUPLOC,
        lastFile.file
      )}`
    );
  } catch (error) {
    console.error(error);
  }
})();
