import React, { Component } from 'react';
import './App.css';
import Web3 from 'web3'
import TFG from '../abis/TFG.json'
import Modal from './Modal';


class App extends Component {

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
        const color = await contract.methods.colors(i-1).call()
        this.setState({colors: [...this.state.colors, color]})
        const prop = await contract.methods.property(i).call()
        console.log(prop)
        if(prop === this.state.account) 
          this.setState({colorsInPropery: [...this.state.colorsInPropery, color]})
        if(prop === address) 
          this.setState({colorsSelling: [...this.state.colorsSelling, color]})
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
      colors: [],
      colorsInPropery: [],
      colorsSelling: [],
      funds: 0,
      show: false,
      errorMessage: '',
      loading: false,
      prices: []
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

  mint = (color, precio) => {
    console.log('¡Nuevo NFT en procedimiento!')
 
    this.state.contract.methods.nuevoColor(color, precio).send({ from: this.state.account })
    .once('receipt', (receipt) => {
      this.setState({
        colors: [...this.state.colors, color]
      })
    })
  }

  async updatePrice(precio, color) {
    var tokenId = -1;
    for (var i = 0; i<this.state.totalSupply; i++){
      if(this.state.colors[i] === color) tokenId = i;
    }
    await this.state.contract.methods.updatePrice(precio, tokenId).send({ from: this.state.account})
  }

  start = e => {
    this.state.contract.methods.addFunds().send({ from: this.state.account })
  }

  async comprar(color) {
    var tokenId = -1;
    for (var i = 0; i<this.state.totalSupply; i++){
      if(this.state.colors[i] === color) tokenId = i;
    }

    if(this.state.colorsSelling.includes(color)){
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
                  event.preventDefault()
                  const color = this.color.value
                  const precio = this.precio.value
                  this.mint(color, precio)
                }}>

                <input 
                type = 'text'
                className = 'form-control mb-1'
                placeholder = 'Ej: #FFFFFF'
                ref = {(input) => {this.color = input}}
                />

                <input 
                type = 'text'
                className = 'form-control mb-1'
                placeholder = '5 monedas'
                ref = {(input) => {this.precio = input}}
                />

                <input 
                type = 'submit'
                className="btn btn-block btn-success"
                value = "NUEVO NFT"
                />
                </form>
              </div>
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
                    {this.state.colorsInPropery.map((color,key) => {
                      return (
                        <div key={key} className="row text-center">
                          <div 
                            className="token-little" 
                            style={{ backgroundColor: color }}>
                          </div>
                          <div>
                            {color}
                          </div>
                        </div>
                      )
                    })}
                  </Modal>
                </div>
              </div>
            </main>
          </div>
          <hr></hr>
          <div className="row text-center">
            {this.state.colors.map((color,key) => {
              var buttonText
              var hid = false
              if(this.state.colorsSelling.includes(color)) buttonText = this.state.colorsInPropery.includes(color) ? "Retirar" : "Comprar"
              else if(this.state.colorsInPropery.includes(color)) buttonText = "Vender"
              else hid = true
              return (
                <div key={key} className="col-md-3 mb-3">
                <div 
                  className="token" 
                  style={{ backgroundColor: color }}>
                </div>
                  <div>
                    {color}
                    <button 
                      className='btn btn-block btn-success '
                      hidden={hid}
                      onClick={e => {
                        this.comprar(color);
                      }}>
                      {buttonText}
                    </button>
                  </div>
                </div>
                
                )
            })}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
