const {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminCreateUserCommand,
    AdminDeleteUserCommand,
    AdminAddUserToGroupCommand,
    AdminGetUserCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const {
    SNSClient,
    SubscribeCommand,
    ListSubscriptionsByTopicCommand,
    UnsubscribeCommand
} = require('@aws-sdk/client-sns');

const {
    SESClient,
    SendEmailCommand
} = require('@aws-sdk/client-ses');


const client = new CognitoIdentityProviderClient({ region: 'eu-central-1' });
const USER_POOL_ID = process.env.USER_POOL_ID || process.env.AUTH_AMPLIFYIOTVUE37AA4154A_USERPOOLID;
const snsClient = new SNSClient({ region: 'eu-central-1' });
const SNS_TOPIC_ARN = 'arn:aws:sns:eu-central-1:717279707507:distance-alert-topic';
const sesClient = new SESClient({ region: 'eu-central-1' });


exports.handler = async (event) => {
    const claims = event.requestContext?.authorizer?.claims || {};
    const groups = claims['cognito:groups'] || [];
    const isAdmin = Array.isArray(groups) ? groups.includes('Admin') : groups === 'Admin';

    if (!isAdmin) {
        return respond(403, { error: 'Nur Admins erlaubt' });
    }

    const { httpMethod, pathParameters, body } = event;

    try {
        if (httpMethod === 'GET') {
            const users = await client.send(new ListUsersCommand({
                UserPoolId: USER_POOL_ID
            }));

            return respond(200, users.Users.map(u => ({
                username: u.Username,
                email: u.Attributes.find(attr => attr.Name === 'email')?.Value || '',
                status: u.UserStatus
            })));
        }

        if (httpMethod === 'POST' && body) {
            const { email } = JSON.parse(body);

            await client.send(new AdminCreateUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: email,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'email_verified', Value: 'true' }
                ]
            }));

            await client.send(new AdminAddUserToGroupCommand({
                UserPoolId: USER_POOL_ID,
                Username: email,
                GroupName: 'User'
            }));

            // SNS subscription
            await snsClient.send(new SubscribeCommand({
                TopicArn: SNS_TOPIC_ARN,
                Protocol: 'email',
                Endpoint: email
            }));

            return respond(200, { message: 'Benutzer erstellt, Gruppe zugewiesen, SNS subscription hinzugefügt' });
        }



        if (httpMethod === 'DELETE' && pathParameters?.username) {
            // 1. E-Mail anhand des Cognito-Nutzers holen
            const user = await client.send(new AdminGetUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: pathParameters.username
            }));
            const emailAttr = user.UserAttributes.find(attr => attr.Name === 'email');
            const email = emailAttr?.Value;

            // 2. SNS-Subscription löschen (wenn vorhanden)
            if (email) {
                try {
                    const subs = await snsClient.send(new ListSubscriptionsByTopicCommand({
                        TopicArn: SNS_TOPIC_ARN
                    }));

                    const matching = subs.Subscriptions.find(sub =>
                        sub?.Endpoint === email && sub?.SubscriptionArn && sub?.SubscriptionArn !== 'PendingConfirmation'
                    );

                    if (matching) {
                        await snsClient.send(new UnsubscribeCommand({
                            SubscriptionArn: matching.SubscriptionArn
                        }));
                    }
                } catch (snsError) {
                    console.warn(`⚠️ Konnte SNS Subscription nicht verarbeiten für ${email}:`, snsError);
                    // Ignorieren, da Löschung trotzdem möglich sein soll
                }

                // 3. E-Mail senden (optional)
                try {
                    await sesClient.send(new SendEmailCommand({
                        Destination: {
                            ToAddresses: [email]
                        },
                        Message: {
                            Subject: { Data: 'Dein Benutzerkonto wurde gelöscht' },
                            Body: {
                                Text: {
                                    Data: `Hallo,

dein Benutzerkonto wurde vom Administrator gelöscht und ist nicht mehr verfügbar.`
                                }
                            }
                        },
                        Source: 'noreply@grafana-proxy.com' // MUSS zu verifizierter Domain gehören
                    }));
                } catch (sesError) {
                    console.warn(`⚠️ Konnte E-Mail nicht senden an ${email}:`, sesError);
                    // Nicht blockierend
                }
            }

            // 4. Cognito-Nutzer löschen (immer!)
            await client.send(new AdminDeleteUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: pathParameters.username
            }));

            return respond(200, { message: 'Benutzer gelöscht (inkl. optionaler SNS und E-Mail)' });
        }




        return respond(405, { error: 'Methode nicht erlaubt oder Route ungültig' });
    } catch (error) {
        console.error('Fehler:', error);
        return respond(500, { error: 'Interner Serverfehler' });
    }
};

function respond(code, body) {
    return {
        statusCode: code,
        body: JSON.stringify(body),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*'
        }
    };
}
