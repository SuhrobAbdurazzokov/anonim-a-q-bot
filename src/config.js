import dotenv from "dotenv";

dotenv.config();

export default {
    TOKEN: process.env.TOKEN,
    ADMIN_ID: process.env.ADMIN_ID,
};
