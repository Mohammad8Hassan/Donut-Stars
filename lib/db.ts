import mysql from 'mysql2/promise';

export const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "555111Mm#",
  database: "donuts",
  port: 3307,
});