import React, { Component } from 'react';
import './App.css';
import Web3 from 'web3'
import TFG from '../abis/TFG.json'
import ipfs from './ipfs.js'
import pdf from '../pdf.png'
import Modal from './Modal'

class App extends Component {
  
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

  //Carga de los componentes de la blockchain
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
      const addressC = await contract.methods.addressC.call()
      console.log("La dirección del cotrato es: " + addressC)
      this.setState({contract})
      // Función 'totalSupply' del Smart Contract
      const totalSupply = await contract.methods.totalSupply().call()
      this.setState({totalSupply})
      const f = await contract.methods.funds(this.state.account).call()
      this.setState({funds: f.toNumber()})
      // Carga de documentos
      console.log("[Documentos almacenados en la cadena de bloques]")
      for (var i = 0; i<totalSupply; i++){
        const doc = await contract.methods.docs(i).call()
        console.log("Hash del documento: " + doc)
        const title = await contract.methods.getTitle(doc).call()
        console.log("Título del documento: " + title)
        this.setState({docs: [...this.state.docs, title]})
        const prop = await contract.methods.getProperty(doc).call()
        console.log("Propietario del documento: " + prop)
        if(prop === this.state.account) {
          this.setState({docsInPropery: [...this.state.docsInPropery, title]})
          console.log("No está en venta")
        }  
        else if(prop === addressC) 
          this.setState({docsSelling: [...this.state.docsSelling, title]})
          console.log("Está en venta")
        }
    } else {
      window.alert('¡Smart Contract no desplegado en la red!')
    }
  }

  //Control del modal de los NFTs en propiedad
  showModal = e => {
    this.setState({
      show: !this.state.show
    });
  };

  onClose = e => {
      this.props.onClose && this.props.onClose(e);
      };

  //Añadir fondos; únicamente disponible para el admin
  start = e => {
    this.state.contract.methods.addFunds().send({ from: this.state.account })
  }

  //Funciones de procesado y subida de ficheros
  captureFile =(event) => {
      event.stopPropagation()
      event.preventDefault()
      const file = event.target.files[0]
      let reader = new window.FileReader()
      reader.readAsArrayBuffer(file)
      reader.onloadend = () => this.convertToBuffer(reader)    
    }

  convertToBuffer = async(reader) => {
      const buffer = await Buffer.from(reader.result);
      this.setState({buffer})
  }

  async onSubmit(precio, titulo){

      await ipfs.add(this.state.buffer, (err, ipfsHash) => 
      {
        console.log(err,ipfsHash)
        
        this.setState({ ipfsHash:ipfsHash[0].hash })
 
        this.state.contract.methods.sendHash(this.state.ipfsHash, precio, titulo).send({
          from: this.state.account
        }, (error, transactionHash) => {
          this.setState({transactionHash})
          this.setState({
            docs: [...this.state.docs, titulo]
          })
        }) 
      }) 
    } 

  async  downloadFile(d) {
    var id
    for (var i = 0; i<this.state.totalSupply; i++){
      const doc = await this.state.contract.methods.docs(i).call()
      const title = await this.state.contract.methods.getTitle(doc).call()
      if(title === d) id = doc;
    }
      //El documento te pertenece; lo puedes descargar
      const fileSrc = `https:ipfs.io/ipfs/${id}`
      const file = await fetch(fileSrc)
      const fileBlog = await file.blob()
      const fileURL = URL.createObjectURL(fileBlog)
    
      const link = document.createElement('a')
      link.href = fileURL
      link.download = 'prueba'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
  
  }

  async buy(d){
    var id
    for (var i = 0; i<this.state.totalSupply; i++){
      const doc = await this.state.contract.methods.docs(i).call()
      const title = await this.state.contract.methods.getTitle(doc).call()
      if(title === d) id = doc;
    }
    //Está en venta; se puede comprar
    if(this.state.docsSelling.includes(d)){
      try{
        await this.state.contract.methods.buy(id).send({ from: this.state.account })
        .once('receipt', (receipt) => {
          console.log("NFT transferido correctamente")
        })
  
      } catch(err){
        this.setState({errorMessage: err.message})
      } finally {
          this.setState({loading:false})
      }
    }
    //No está en venta; se puede vender
    else {
      console.log("Quiero vender")
      this.state.contract.methods.permission(id).send({ from: this.state.account })
    }
  }

  //Renderizado de la página html
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
              </div>
            </main>

            <div className='mx-auto row text-center'>
              <h3> [ Listado de documentos disponibles ]</h3>
            </div>
              
            <div className='mx-auto row text-center'>
              {this.state.docs.map((doc, key) => {
                var texto
                var hid
                var hid2 = true
                if (this.state.docsSelling.includes(doc)) texto = this.state.docsInPropery.includes(doc) ? "x Retirar x" : " $ Comprar $"
                else if (this.state.docsInPropery.includes(doc)) {texto = "$ Vender $"; hid2=false}
                else hid = true                
                return(
                  <div 
                    key={key}
                    className="p-2"
                  > 
                  <img src={pdf} alt={doc} width="40" height="45"></img>


                  <h5>{doc}</h5>
                  
                  <h6 hidden={hid2} className="text-primary"> [En propiedad] </h6>
                  
                  <div>
                    <button 
                      onClick={(e) => {
                        this.downloadFile(doc)
                      }}
                      className="btn mx-auto btn-success"
                      hidden={hid2}> 
                      ▼ Descargar ▼
                    </button>
                  </div>

                  <div className='p-2'>
                    <button
                        onClick={(e) => {
                        this.buy(doc)
                        }}
                      className="btn mx-auto btn-warning"
                      hidden={hid}>
                      {texto}
                    </button>
                  </div>
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
