import React, { useEffect,useState } from 'react';
import { SignClient } from '@walletconnect/sign-client';
import { Web3Modal } from '@web3modal/standalone';

const web3modal = new Web3Modal({
  projectId:process.env.REACT_APP_PROJECT_ID,
  standaloneChains:["eip155:5"]
}); 

function App() {
  const [signClient,setSignClient] = useState();
  const [sessions,setSessions] = useState();
  const [accounts,setAccounts] = useState();
  const [txnHash,setTxnHash] = useState();

  async function createClient() {
   try {
    const client = await SignClient.init({
      projectId:process.env.REACT_APP_PROJECT_ID
    })
    setSignClient(client);
    await subscribeToEvents(client);
   } catch (error) {
    console.log(error,"errorCheck");
   } 
  }
  useEffect(()=>{
    if(!signClient){
      createClient();
    }
  },[signClient]);

  async function onSessionConnect (session) {
    if(!session) throw Error("session doesn't exist");
    try {
      setSessions(session);
      setAccounts(session.namespaces.eip155.accounts[0].slice(9));
    } catch (error) {
      console.log(error,"checkSessionError");
    }
  }

  async function handleConnect(){
    if(!signClient) throw Error("Cannot Sign In")
    try {
      const proposalNamespace = {
        eip155:{
          chains:["eip155:5"],
          methods:["eth_sendTransaction"],
          events:["connect","disconnect"]
        }
      }
      const {uri,approval} = await signClient.connect({
        requiredNamespaces:proposalNamespace
      })
      console.log(uri,"checkURI");
      if(uri){
        web3modal.openModal({uri});
        const sessionNamespace = await approval();
        onSessionConnect(sessionNamespace);
        web3modal.closeModal();
      }
    } catch (error) {
      console.log(error,"error handleconnect");
    }
  }

  async function handleDisconnect(){
    try {
      reset();
      await signClient.disconnect({
        topic:sessions.topic,
        code:6000,
        message:"User Disconnected the session from their wallet"
      })
    } catch (error) {
      console.log(error,"checkHandleDisconnect error");
    }
  }

  async function handleSend(){
    try {
      const tx = {
          from: accounts,
          to: "0xBDE1EAE59cE082505bB73fedBa56252b1b9C60Ce",
          data: "0x",
          gasPrice: "0x029104e28c",
          gasLimit: "0x5208",
          value: "0x00",
        };
      const result = await signClient.request({
        topic:sessions.topic,
        request:{
          method:"eth_sendTransaction",
          params:[tx]
        },
        chainId:"eip155:5"
      });  
      setTxnHash(result);
      console.log("result",result);
    } catch (error) {
      console.log("errorHandleTransaction",error);
    }
  }

  const reset = () => {
    setAccounts([]);
    setSessions([]);
  }

  async function subscribeToEvents(client){
    if(!client)throw Error("Not subbed to events")
    try {
      client.on("session_delete",()=>{
        console.log("User Disconnected");
        reset();
      });
    } catch (error) {
      console.log("checkSubs",error);
    }
  }
  return (
    <div className="App">
      {accounts?.length ?
      <>
      <p>{accounts}</p>
      <button onClick={handleDisconnect}>Disconnect</button>
      <button onClick={handleSend}>Send</button>
      {txnHash && <p>Check Transaction status of <a href={`https://goerli.etherscan.io/tx/${txnHash}`} target={"blank"}>{txnHash}</a></p>}
      </>
      :
      <button onClick={handleConnect} disabled={!signClient}>Connect</button>
      }
    </div>
  );
}

export default App;
