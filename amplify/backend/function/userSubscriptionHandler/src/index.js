const {
    SNSClient,
    SubscribeCommand,
    ListSubscriptionsByTopicCommand,
    UnsubscribeCommand
} = require('@aws-sdk/client-sns')

const snsClient = new SNSClient({ region: 'eu-central-1' })
const SNS_TOPIC_ARN = 'arn:aws:sns:eu-central-1:717279707507:distance-alert-topic'

exports.handler = async (event) => {
    const httpMethod = event.httpMethod
    const path = event.path
    const claims = event.requestContext?.authorizer?.claims || {}
    const email = claims.email

    if (!email) return respond(401, { error: 'Nicht authentifiziert oder keine E-Mail vorhanden' })

    try {
        if (httpMethod === 'PUT' && path === '/user/subscription') {
            const subs = await snsClient.send(new ListSubscriptionsByTopicCommand({ TopicArn: SNS_TOPIC_ARN }))
            const alreadySubscribed = subs.Subscriptions.find(sub => sub.Endpoint === email)

            if (alreadySubscribed) {
                return respond(409, { message: 'Bereits abonniert' })
            }

            await snsClient.send(new SubscribeCommand({
                TopicArn: SNS_TOPIC_ARN,
                Protocol: 'email',
                Endpoint: email
            }))

            return respond(200, { message: 'Erfolgreich abonniert' })
        }

        if (httpMethod === 'GET' && path === '/user/subscription') {
            const email = claims.email;
            if (!email) return respond(400, { error: 'E-Mail nicht im Token gefunden' });

            try {
                const subs = await snsClient.send(new ListSubscriptionsByTopicCommand({
                    TopicArn: SNS_TOPIC_ARN
                }));

                const match = subs.Subscriptions.find(sub => sub.Endpoint === email);
                const isConfirmed = match?.SubscriptionArn && !match.SubscriptionArn.startsWith('Pending');

                return respond(200, {
                    subscribed: !!match,
                    confirmed: isConfirmed
                });
            } catch (err) {
                console.error('Fehler beim Prüfen der Subscription:', err);
                return respond(500, { error: 'Fehler beim Abfragen der Subscription' });
            }
        }



        if (httpMethod === 'DELETE' && path === '/user/subscription') {
            const subs = await snsClient.send(new ListSubscriptionsByTopicCommand({ TopicArn: SNS_TOPIC_ARN }))
            const match = subs.Subscriptions.find(sub => sub.Endpoint === email)

            if (!match) {
                return respond(404, { message: 'Keine Subscription gefunden' })
            }

            if (match && match.SubscriptionArn && !match.SubscriptionArn.startsWith('Pending')) {
                await snsClient.send(new UnsubscribeCommand({
                    SubscriptionArn: match.SubscriptionArn
                }));
            }

            return respond(200, { message: 'Abmeldung erfolgreich' })
        }

        return respond(405, { error: 'Nicht unterstützte Methode oder Pfad' })
    } catch (error) {
        console.error('Fehler in /user/subscription:', error)
        return respond(500, { error: 'Interner Serverfehler' })
    }
}

function respond(code, body) {
    return {
        statusCode: code,
        body: JSON.stringify(body),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*'
        }
    }
}
