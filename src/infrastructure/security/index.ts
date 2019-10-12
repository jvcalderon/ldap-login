import {AuthManagerInterface} from './authManagers/Interface'
import {Ldap as LdapAuthManager} from './authManagers/Ldap'
import {Ldap as LdapUserProvider} from './userProviders/Ldap'
import {UserProvider} from './userProviders/UserProvider'
import {UserProviderInterface} from './userProviders/Interface'

interface UserProviderClass<U extends UserProvider> {
    new (config: Object): UserProviderInterface
}

interface Config {
    manager: AuthManagerInterface,
    provider: UserProviderClass<UserProvider>,
    providerOptions: Object
}

class Security {
  private readonly manager: AuthManagerInterface
  private readonly Provider: UserProviderClass<UserProvider>
  private readonly providerOptions: Object

  public constructor(config: Config) {
      const {manager, provider, providerOptions} = config
      this.manager = manager
      this.Provider = provider
      this.providerOptions = providerOptions
  }

  public async login(user: string, pwd: string) {
      const isValid = await this.manager.login(user, pwd)
      if(!isValid) {
          return {}
      }
      const userProvider = new this.Provider({...{authManager: this.manager}, ...this.providerOptions})
      return await userProvider.getUser()
  }
}

export {
    Security,
    UserProviderInterface,
    UserProvider,
    LdapAuthManager,
    LdapUserProvider
}
