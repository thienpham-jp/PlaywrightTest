import users from "./users.json";

export const ADMIN_USERNAME = users.admin.username;
export const ADMIN_PASSWORD = users.admin.password;

export const NORMAL_USERNAME = users.normalUser.username;
export const NORMAL_PASSWORD = users.normalUser.password;

// User credentials from UserSecret
const USER_UID = users.secretKey.user;
const SECRET_KEY = users.secretKey.key;

// CFD User Credentials
export const CFD_USERNAME = users.cfdUser.username;
export const CFD_PASSWORD = users.cfdUser.password;

export { users, USER_UID, SECRET_KEY };
