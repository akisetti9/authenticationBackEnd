const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Create User API
app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 5) {
      //If the registrant provides a password with less than 5 characters
      response.status(400);
      response.send("Password is too short");
    } else {
      //Successful registration of the registrant
      const createUserQuery = `
            INSERT INTO
                user (username, name, password, gender, location)
            VALUES
            (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    //If the username already exists
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //If an unregistered user tries to login
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      //Successful login of the user
      response.status(200);
      response.send("Login success!");
    } else {
      //If the user provides incorrect password
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Update User Password API
app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  //if (dbUser === undefined) {
  //If the username already exists
  //  response.status(400);
  //  response.send("Invalid user");
  //} else {
  const isOldPasswordMatched = await bcrypt.compare(
    oldPassword,
    dbUser.password
  );
  if (isOldPasswordMatched === true) {
    if (newPassword.length < 5) {
      //If the user provides new password with less than 5 characters
      response.status(400);
      response.send("Password is too short");
    } else {
      //Successful password update
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `
                    UPDATE
                        user
                    SET
                        username = '${username}',
                        password = '${hashedNewPassword}'
                    ;`;
      await db.run(updatePasswordQuery);
      response.status(200);
      response.send("Password updated");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});

module.exports = app;
