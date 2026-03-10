import { getDb } from '../db.client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export interface User {
    id: string;
    restaurant_id: string;
    name: string;
    username: string;
    password_hash: string;
    role: 'owner' | 'manager' | 'staff';
    last_login?: string;
    active: number;
    created_at: string;
}

export const usersRepo = {
    async createUser(data: Partial<User>) {
        const db = await getDb();
        const id = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(data.password_hash!, salt);

        await db.run(
            `INSERT INTO users (id, restaurant_id, name, username, password_hash, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, data.restaurant_id, data.name, data.username, hash, data.role || 'staff']
        );
        return id;
    },

    async findByUsername(restaurantId: string, username: string): Promise<User | null> {
        const db = await getDb();
        const user = await db.get(`SELECT * FROM users WHERE restaurant_id = ? AND username = ? AND active = 1`, [restaurantId, username]);
        return user || null;
    },

    async findById(id: string): Promise<User | null> {
        const db = await getDb();
        const user = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
        return user || null;
    },

    async listByRestaurant(restaurantId: string): Promise<User[]> {
        const db = await getDb();
        return db.all(`SELECT id, name, username, role, last_login, active, created_at FROM users WHERE restaurant_id = ?`, [restaurantId]);
    },

    async updateLastLogin(id: string) {
        const db = await getDb();
        await db.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [id]);
    },

    async deleteUser(id: string, restaurantId: string) {
        const db = await getDb();
        return db.run(`DELETE FROM users WHERE id = ? AND restaurant_id = ? AND role != 'owner'`, [id, restaurantId]);
    }
};
