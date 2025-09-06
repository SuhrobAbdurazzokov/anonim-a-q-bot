import dotenv from "dotenv";

dotenv.config();

const config = {
    TOKEN: process.env.TOKEN,
    ADMIN_ID: process.env.ADMIN_ID,
};

export default config;
