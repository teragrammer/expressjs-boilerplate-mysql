export interface RegisterInput {
    first_name: string;
    middle_name?: string; // Optional field
    last_name: string;
    username: string;
    password: string;
    email: string;
}