import React, { Component } from 'react';
import './App.css';
import Web3 from 'web3'
import TFG from '../abis/TFG.json'
import Modal from './Modal';
import ipfs from './ipfs.js'

class App extends Component {

  captureFile =(event) => 
  {
      event.stopPropagation()
      event.preventDefault()
      const file = event.target.files[0]
      let reader = new window.FileReader()
      reader.readAsArrayBuffer(file)
      reader.onloadend = () => this.convertToBuffer(reader)    
    };

  convertToBuffer = async(reader) =>
  {
    //file is converted to a buffer to prepare for uploading to IPFS
      const buffer = await Buffer.from(reader.result);
    //set this buffer -using es6 syntax
      this.setState({buffer});
  };

  async onSubmit(precio){

      await ipfs.add(this.state.buffer, (err, ipfsHash) => 
      {
        console.log(err,ipfsHash);
        
        this.setState({ ipfsHash:ipfsHash[0].hash });
 
        this.state.contract.methods.sendHash(this.state.ipfsHash, precio).send({
          from: this.state.account
        }, (error, transactionHash) => {
          this.setState({transactionHash});
        }); 
      }) 
    }; 

  async  downloadImage(img) {
    const imageSrc = `https:ipfs.io/ipfs/${img}`
    const image = await fetch(imageSrc)
    const imageBlog = await image.blob()
    const imageURL = URL.createObjectURL(imageBlog)
  
    const link = document.createElement('a')
    link.href = imageURL
    link.download = 'prueba'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    if(window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }

    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }

    else {
      window.alert('¡Considera usar Metamask!')
    }

  }

  async loadBlockchainData(){
    const web3 = window.web3
    // Cargar una cuenta
    const accounts = await web3.eth.getAccounts()
    this.setState({account: accounts[0]})
    const networkId = await web3.eth.net.getId()
    const networkData = TFG.networks[networkId]
    if(networkData) {
      const abi = TFG.abi 
      const address = networkData.address
      const contract = new web3.eth.Contract(abi, address)
      this.setState({contract})
      // Función 'totalSupply' del Smart Contract
      const totalSupply = await contract.methods.totalSupply().call()
      this.setState({totalSupply})
      const f = await contract.methods.funds(this.state.account).call()
      //console.log(f.toNumber())
      this.setState({funds: f.toNumber()})
      // Carga de colores
      for (var i = 1; i<=totalSupply; i++){
        const doc = await contract.methods.docs(i-1).call()
        this.setState({docs: [...this.state.docs, doc]})
        const prop = await contract.methods.property(i).call()
        console.log(prop)
        /*if(prop === this.state.account) 
          this.setState({docsInProperty: [...this.state.docsInProperty, doc]})
        if(prop === address) 
          this.setState({docsSelling: [...this.state.docsSelling, doc]})
        */
        }
    } else {
      window.alert('¡Smart Contract no desplegado en la red!')
    }
  }

  // Constructor
  constructor(props) {
    super(props)
    this.state = {
      account: '',
      contract: null,
      totalSupply: 0,
      docs: [],
      docsInPropery: [],
      docsSelling: [],
      funds: 0,
      show: false,
      errorMessage: '',
      loading: false,
      prices: [],
      ipfsHash: null,
      transactionHash:'',
      buffer:''
    }
  }

  showModal = e => {
    this.setState({
      show: !this.state.show
    });
  };

  onClose = e => {
      this.props.onClose && this.props.onClose(e);
      };

  mint = (ipfsHash, precio) => {
    console.log('¡Nuevo NFT en procedimiento!')
 
    this.state.contract.methods.nuevoDoc(ipfsHash, precio).send({ from: this.state.account })
    .once('receipt', (receipt) => {
      this.setState({
        docs: [...this.state.docs, ipfsHash]
      })
    })
  }

  async updatePrice(precio, ipfsHash) {
    var tokenId = -1;
    for (var i = 0; i<this.state.totalSupply; i++){
      if(this.state.docs[i] === ipfsHash) tokenId = i;
    }
    await this.state.contract.methods.updatePrice(precio, tokenId).send({ from: this.state.account})
  }

  start = e => {
    this.state.contract.methods.addFunds().send({ from: this.state.account })
  }

  async comprar(ipfsHash) {
    var tokenId = -1;
    for (var i = 0; i<this.state.totalSupply; i++){
      if(this.state.docs[i] === ipfsHash) tokenId = i;
    }

    if(this.state.docsSelling.includes(ipfsHash)){
      try{
        await this.state.contract.methods.buy(tokenId).send({ from: this.state.account })
        .once('receipt', (receipt) => {
          console.log("NFT transferido correctamente")
        })
  
      } catch(err){
        this.setState({errorMessage: err.message})
      } finally {
          this.setState({loading:false})
      }
    }
    else {
      this.state.contract.methods.permission(tokenId).send({ from: this.state.account })
    }

  }

render() {
    return (
      <div>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">

          <div className="text-white justify-content-center"> 
            <button onClick={this.start} className="btn-sm btn-warning "> [+] </button>
              Saldo actual: {this.state.funds}
          </div>

          <ul className="navbar-nav px-3">
            <li className="nav-item text-nowrap d-none d-sm-none d-sm-block">
              <small className="text-white">
                <span id="account">
                  {this.state.account}
                </span>   
              </small>
            </li>
          </ul>
        </nav>
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">

                <h1> DApp de un coleccionable de NFT's</h1>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  const precio = this.precio.value
                  this.onSubmit(precio)
                  
                  }}>

                  <input 
                  type = "file"
                  onChange = {this.captureFile}
                  />

                  <input 
                  type = 'text'
                  className = 'form-control mb-1'
                  placeholder = '5 monedas'
                  ref = {(input) => {this.precio = input}}
                  />


                  <button 
                  type="submit"> 
                  Nuevo NFT 
                  </button>

                </form>

                <img src={`https:ipfs.io/ipfs/${this.state.ipfsHash}`} alt=""/>
                <button onClick={(e) => {this.downloadImage(this.state.ipfsHash)}}> Descargar </button>
            
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
