import { config } from "dotenv";

config();

export default {
	TOKEN: process.env.token,
	ADMIN_ID: process.env.admin_id
}