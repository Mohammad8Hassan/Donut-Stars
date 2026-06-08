import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "555111Mm#",
  database: "donuts",
  port: 3307,
  waitForConnections: true,
  connectionLimit: 10,
});