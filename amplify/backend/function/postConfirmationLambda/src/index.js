const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { CognitoIdentityProviderClient, ListUsersCommand } = require("@aws-sdk/client-cognito-identity-provider");

const sns = new SNSClient({ region: "eu-central-1" });
const cognito = new CognitoIdentityProviderClient({ region: "eu-central-1" });

const userPoolId = "eu-central-1_4WflHc8Ea"; // Deinen User Pool ID eintragen
const snsTopicArn = "arn:aws:sns:eu-central-1:717279707507:distance-alert-topic"; // Dein SNS Topic ARN

exports.handler = async (event) => {
    console.log("Post Confirmation Event:", JSON.stringify(event));

    try {
        // Alle Nutzer aus Cognito User Pool abrufen
        const usersData = await cognito.send(new ListUsersCommand({ UserPoolId: userPoolId }));

        const emails = usersData.Users
            .map(user => user.Attributes.find(attr => attr.Name === "email")?.Value)
            .filter(email => !!email);

        console.log("Alle E-Mail-Adressen:", emails);

        // E-Mail an alle Nutzer schicken via SNS (hier kannst du auch anpassen)
        for (const email of emails) {
            await sns.send(new PublishCommand({
                TopicArn: snsTopicArn,
                Message: `Neuer Nutzer registriert sich: ${event.userName}`,
                Subject: "Neue Registrierung im System",
                MessageAttributes: {
                    "email": {
                        DataType: "String",
                        StringValue: email
                    }
                }
            }));
        }

        return event;  // Wichtig: event zurückgeben, damit die Registrierung erfolgreich fortgesetzt wird
    } catch (error) {
        console.error("Fehler im Post Confirmation Trigger:", error);
        throw error;
    }
};
