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

  async onSubmit(precio, titulo){

      await ipfs.add(this.state.buffer, (err, ipfsHash) => 
      {
        console.log(err,ipfsHash);
        
        this.setState({ ipfsHash:ipfsHash[0].hash });
 
        this.state.contract.methods.sendHash(this.state.ipfsHash, precio, titulo).send({
          from: this.state.account
        }, (error, transactionHash) => {
          this.setState({transactionHash});
          this.setState({
            docs: [...this.state.docs, titulo]
          })
        }); 
      }) 
    }; 

  async  downloadImage(d) {
    
    var id
    for (var i = 0; i<this.state.totalSupply; i++){
      const doc = await this.state.contract.methods.docs(i).call()
      const title = await this.state.contract.methods.getTitle(doc).call()
      if(title === d) id = doc;
    }
    const imageSrc = `https:ipfs.io/ipfs/${id}`
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
      for (var i = 0; i<totalSupply; i++){
        const doc = await contract.methods.docs(i).call()
        console.log(doc)
        const title = await contract.methods.getTitle(doc).call()
        console.log(title)
        this.setState({docs: [...this.state.docs, title]})
        const prop = await contract.methods.getProperty(doc).call()
        console.log(prop)
        if(prop === this.state.account) {
          this.setState({docsInPropery: [...this.state.docsInPropery, title]})
          console.log("TUYO")
        }
          
        if(prop === address) 
          this.setState({docsSelling: [...this.state.docsSelling, title]})
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
                  const titulo =this.titulo.value
                  this.onSubmit(precio, titulo)
                  
                  }}>

                  <input 
                  type = 'text'
                  className = 'form-control mb-1'
                  placeholder = 'Título del NFT'
                  ref = {(input) => {this.titulo = input}}
                  />

                  <input 
                  type = 'text'
                  className = 'form-control mb-1'
                  placeholder = '5 monedas'
                  ref = {(input) => {this.precio = input}}
                  />

                  <input 
                  type = "file"
                  onChange = {this.captureFile}
                  />

                  <button 
                  type="submit"
                  className='btn btn-success'> 
                  Nuevo NFT 
                  </button>

                </form>

                <div className="content mr-auto ml-auto">
                  <button  
                    className="btn btn-block btn-info"
                      onClick={e => {
                      this.showModal();
                    }}> 
                  NFTs en propiedad
                  </button>
                  <div className="d-inline-flex flex-row justify-content-center">
                  <Modal 
                    onClose={this.showModal} 
                    show={this.state.show}> 
                    {this.state.docsInPropery.map((doc,key) => {
                      return (
                        <div key={key} className="row text-center">
                          <div>
                            {doc}
                          </div>
                        </div>
                      )
                    })}
                  </Modal>
                  </div>
                </div>
              </div>
            </main>

            <hr></hr>
            <div className='mx-auto row text-center'>
              {this.state.docs.map((doc, key) => {
                return(
                  <div key={key}> 
                    <h3>{doc}</h3>
                    <button onClick={(e) => {this.downloadImage(doc)}}> Descargar </button>
                  </div>
                )
              })
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
