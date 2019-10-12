export interface AuthManagerInterface {
    login: (user: string, pwd: string) => Promise<boolean>
    getClient: () => Object
}
