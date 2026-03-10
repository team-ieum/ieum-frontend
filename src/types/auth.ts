export interface RequestLoginDto {
    email: string
    password: string
}

export interface ResponseLoginDto {
    id: string
    email: string
    name: string
    createdAt: string
    updatedAt: string
}