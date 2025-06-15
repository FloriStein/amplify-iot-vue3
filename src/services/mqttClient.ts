import { PubSub } from '@aws-amplify/pubsub';
import { fetchAuthSession } from 'aws-amplify/auth';

export function useMqttClient() {
    var client : PubSub | null = null;
    const subscriptions : Array<{ unsubscribe: () => void }> = [];

    async function setupClient() {
        if(client)
            return true;

        const session = await fetchAuthSession();
        if(!session)
            return false;

        client = new PubSub({
            region: 'eu-central-1',
            endpoint: 'wss://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com/mqtt',
            credentials: session.credentials
        });
        return true;
    }

    function subscribeToTopic(topic : string, callback: (message : any) => void) {
        if (!client){
            console.error("Topic subscription failed: Client null");
            return;
        }

        subscriptions.push(client.subscribe({ topics: [topic] }).subscribe({
            next: (data: any) => {
                const value = data?.value ?? data
                const parsed = JSON.parse(JSON.stringify(value))
                console.log(`MQTT-Message on ${topic}:`, parsed);
                callback(parsed);
            },
            error: (error: any) => {
                console.error(`Error while subscibing ${topic}:`, error);
            }
        }));
        console.log("Subscriped to topic", topic);
    }

    function clear() {
        subscriptions.forEach(sub => sub.unsubscribe());
        subscriptions.length = 0;
        console.log("Cleared Subscriptions");
    }

  async function startIfAuthenticated() {
    console.log("Attempting MQTT Logon");
    const res = await setupClient();
    if(!res || !client){
        console.log("Logon failed");
        return false;
    }
    console.log("Logon succeeded");
    return true;
  }

  return {
    startIfAuthenticated,
    subscribeToTopic,
    clear
  };
}
