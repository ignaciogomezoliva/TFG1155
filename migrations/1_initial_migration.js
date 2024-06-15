const Migrations = artifacts.require('Migrations');
const TFG = artifacts.require('TFG');
const Market = artifacts.require('Market');

module.exports = function (deployer) {
	deployer.deploy(Migrations);
	deployer.deploy(TFG);
	deployer.deploy(Market);

};