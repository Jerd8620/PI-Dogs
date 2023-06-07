const axios = require("axios");
const { API_KEY } = process.env;
const { Temperament } = require("../db");

const allTemps = async () => {
  const temps = await axios.get(
    `https://api.thedogapi.com/v1/breeds?api_key=${API_KEY}`
  ); //me trae los temps en forma de arrelgo

  temps.data.forEach((elem) => {
    //analizo cada elemento del arreglo de razas
    if (elem.temperament) {
      let temps = elem.temperament.split(", ");

      temps.forEach((e) => {
        Temperament.findOrCreate({
          
          where: { name: e }, 
        });
      });
    }
  });
  const findTemps = await Temperament.findAll();
  return findTemps; 
};

module.exports = { allTemps };
