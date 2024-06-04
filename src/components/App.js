import React, { Component } from 'react'
import './App.css'
import 'animate.css'
import Web3 from 'web3'
import TFG from '../abis/TFG.json'
import ipfs from './ipfs.js'
import pdf from '../pdf.png'
import logo from '../logo.png'
import Swal from 'sweetalert2'

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
      errorMessage: '',
      loading: false,
      prices: [],
      ipfsHash: null,
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
      // Revisar para qué es necesario esto
      const totalSupply = await contract.methods.totalSupply().call()
      this.setState({totalSupply})

      //Fondos de la cartera
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

  async onSubmit(precio, titulo, descripcion){

      await ipfs.add(this.state.buffer, (err, ipfsHash) => 
      {
        console.log(err,ipfsHash)
        
        this.setState({ ipfsHash:ipfsHash[0].hash })
 
        this.state.contract.methods
          .sendHash(this.state.ipfsHash, precio, titulo, descripcion)
          .send({
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
      link.download = d
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
  //Popups de información sobre los documentos
  async alertBox(d) {

    var id
    var t
    for (var i = 0; i<this.state.totalSupply; i++){
      const doc = await this.state.contract.methods.docs(i).call()
      const title = await this.state.contract.methods.getTitle(doc).call()
      if(title === d) {
        id = doc
        t = title
      }
    }
    const precio = await this.state.contract.methods.getPrice(id).call()
    const desc = await this.state.contract.methods.getDescription(id).call()
    if (this.state.docsInPropery.includes(d)){
      //Es tuyo; permite modificar parámetros
      const { value: formValues } = await Swal.fire({
        title: 'Modificar datos',
        icon: "question",
        html:
          '<u> Descripción:</u> ' + desc + '<br>' + 
          '<u> Precio:</u> ' + precio + " moneda(s)"+ '<br>' +
          '<input id="swal-input1" class="swal2-input" placeholder="Nueva descripción">' +
          '<input id="swal-input2" class="swal2-input" placeholder="Nuevo precio">',
        focusConfirm: false,
        preConfirm: () => {
          return [
            document.getElementById('swal-input1').value,
            document.getElementById('swal-input2').value
          ]
        }
      })
      try{
        if (formValues[0] && formValues[1])
        await this.state.contract.methods.update(id, formValues[0], formValues[1]).send({from: this.state.account})
      
      if (formValues[0]) 
        await this.state.contract.methods.setDescription(id, formValues[0]).send({from: this.state.account})
      
      if (formValues[1])
        await this.state.contract.methods.setPrice(id, formValues[1]).send({from: this.state.account})
      
      }catch(err){
        console.log(err)
      }
      
    }
    else {
      //No es tuyo; la caja arroja solamente información
      Swal.fire({
        title: t,
        text: desc,
        footer: "El precio de este documento es de: " + precio + " moneda(s).",
        icon: "info"
      })
    }
    
  }

  //Renderizado de la página html
  render() {

    return (
      <>
      <header>
        <div>
          <nav className="navbar navbar-dark fixed-top bg-dark flex p-0 ">
            <div className="text-white justify-content-center">
              <button onClick={this.start} className="btn-sm btn-warning ">[+]</button>
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
        </div>

      </header>
      
      <body>
        
        <div className="container-fluid mt-5">
          <div className='text-center'>
            <h1 className='animate__animated animate__zoomIn'>Non Fungible Notes</h1>
            <img src={logo} alt="NFN" className='animate__animated animate__heartBeat'></img>
            <h2 className='animate__animated animate__zoomIn'>Trabajo fin de grado</h2>
          </div>

          
          <form className='animate__animated animate__fadeInUp animate__delay-2s' onSubmit={(event) => {
            event.preventDefault();
            const precio = this.precio.value
            const titulo =this.titulo.value
            const desc = this.desc.value
            this.onSubmit(precio, titulo, desc)
            }}>

            <input 
              type = 'text'
              className = 'form-control mb-1'
              placeholder = 'Título'
              ref = {(input) => {this.titulo = input}}
            />

            <input 
              type = 'text'
              className = 'form-control mb-1'
              placeholder = 'Descripción'
              ref = {(input) => {this.desc = input}}
            />

            <input 
              type = 'text'
              className = 'form-control mb-1'
              placeholder = 'Precio'
              ref = {(input) => {this.precio = input}}
            />

            <div className="d-flex flex-row justify-content-center p-1">
              <input 
                type = "file"
                onChange = {this.captureFile}
              />
            </div>
          
            <div className="d-flex flex-row justify-content-center p-3">
              <button 
                type="submit"
                className='btn btn-success'> 
                Nuevo NFT 
              </button>
            </div>
            

          </form>

        </div>

        <h3 className='text-center animate__animated animate__fadeInUp animate__delay-3s'> [ Listado de documentos disponibles ]</h3>

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
                className="p-2 animate__animated animate__fadeInRightBig animate__delay-3s"> 
         
                <img src={pdf} alt={doc} width="40" height="45" onClick={(e) => this.alertBox(doc)}></img>

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

      </body>
      </>
    );
  }
}

export default App;
