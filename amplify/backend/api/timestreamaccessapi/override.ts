import { AmplifyApiRestResourceStackTemplate } from '@aws-amplify/cli-extensibility-helper'

export function override(resources: AmplifyApiRestResourceStackTemplate) {
    const authResourceName = 'amplifyiotvue37aa4154a'
    const userPoolArnParameter = 'AuthCognitoUserPoolArn'

    // 1. Dynamischer Parameter für den Cognito User Pool ARN
    resources.addCfnParameter(
        {
            type: 'String',
            description: 'ARN des Cognito User Pools',
            default: 'NONE',
        },
        userPoolArnParameter,
        {
            'Fn::GetAtt': [`auth${authResourceName}`, 'Outputs.UserPoolArn'],
        }
    )

    // 2. Sicherheitsdefinition für Cognito
    resources.restApi.addPropertyOverride('Body.securityDefinitions', {
        Cognito: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            'x-amazon-apigateway-authtype': 'cognito_user_pools',
            'x-amazon-apigateway-authorizer': {
                type: 'cognito_user_pools',
                providerARNs: [
                    {
                        'Fn::Join': ['', [{ Ref: userPoolArnParameter }]],
                    },
                ],
            },
        },
    })

    const paths = resources.restApi.body.paths

    // 3. Entferne alle {proxy+} Routen
    Object.keys(paths).forEach((path) => {
        if (path.includes('{proxy+}')) {
            delete paths[path]
        }
    })

    // 4. Einheitlicher CORS OPTIONS-Handler
    const corsHandler = {
        consumes: ['application/json'],
        produces: ['application/json'],
        responses: {
            '200': {
                description: 'CORS support',
                headers: {
                    'Access-Control-Allow-Origin': { type: 'string' },
                    'Access-Control-Allow-Methods': { type: 'string' },
                    'Access-Control-Allow-Headers': { type: 'string' },
                },
            },
        },
        'x-amazon-apigateway-integration': {
            type: 'mock',
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
            responses: {
                default: {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'http://localhost:5173'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                    },
                },
            },
        },
    }

    // 5. Relevante Pfade mit CORS-Handler ausstatten
    const corsPaths = ['/admin/users', '/user/subscription', '/data']
    corsPaths.forEach((p) => {
        if (paths[p]) {
            paths[p].options = corsHandler
        }
    })

    // 6. Allen Pfaden den Cognito Authorizer und Auth-Header hinzufügen
    for (const path in paths) {
        const method = paths[path]['x-amazon-apigateway-any-method']
        if (method) {
            // Authorization Header hinzufügen
            resources.restApi.addPropertyOverride(
                `Body.paths.${path}.x-amazon-apigateway-any-method.parameters`,
                [
                    ...(method.parameters ?? []),
                    {
                        name: 'Authorization',
                        in: 'header',
                        required: false,
                        type: 'string',
                    },
                ]
            )

            // Cognito Authorizer aktivieren
            resources.restApi.addPropertyOverride(
                `Body.paths.${path}.x-amazon-apigateway-any-method.security`,
                [{ Cognito: [] }]
            )
        }
    }
}
