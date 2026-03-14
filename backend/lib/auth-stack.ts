import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as identityPool from "aws-cdk-lib/aws-cognito-identitypool";
import { Construct } from "constructs";

interface AuthStackProps extends cdk.StackProps {
  bucketName: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly webClient: cognito.UserPoolClient;
  public readonly identityPool: identityPool.IdentityPool;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const stackName = cdk.Stack.of(this).stackName.toLocaleLowerCase();

    // 管理者だけがユーザ作成可能でメールアドレス不要
    this.userPool = new cognito.UserPool(this, "userpool", {
      userPoolName: `${stackName}-userpool`,
      accountRecovery: cognito.AccountRecovery.NONE,
      autoVerify: {
        email: true,
      },
      selfSignUpEnabled: false,
      signInCaseSensitive: false,
      signInAliases: { username: true, email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Webからのアクセス用のクライアントを作成
    this.webClient = this.userPool.addClient("webclient", {
      userPoolClientName: `${stackName}-webclient`,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    // 特に認可は付与しない
    // 認証だけ行い、Lambda側で処理する
    this.identityPool = new identityPool.IdentityPool(this, "identitypool", {
      identityPoolName: `${stackName}-identitypool`,
      allowUnauthenticatedIdentities: true,
      authenticationProviders: {
        userPools: [
          new identityPool.UserPoolAuthenticationProvider({
            userPool: this.userPool,
            userPoolClient: this.webClient,
          }),
        ],
      },
    });
  }
}
