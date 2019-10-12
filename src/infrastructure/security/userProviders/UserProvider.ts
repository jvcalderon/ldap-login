import * as jwt from 'jsonwebtoken'

interface Config {
    jwtPrivateKey: string
    jwtExpiration: number
}

export abstract class UserProvider {
    private readonly jwtPrivateKey: string
    private readonly jwtExpiration: number

    public constructor(cnfg: Config) {
        const {jwtPrivateKey, jwtExpiration} = cnfg
        this.jwtPrivateKey = jwtPrivateKey
        this.jwtExpiration = jwtExpiration
    }

    public getToken(username: string) {
        return jwt.sign({data: { username }}, this.jwtPrivateKey, {expiresIn: (this.jwtExpiration) })
    }
}
