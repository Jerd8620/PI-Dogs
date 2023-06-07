const { Router } = require("express");
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const axios = require("axios"); // se debe de traer axios

const { Temperament, Dog } = require(".../db");

const { YOUR_API_KEY } = process.env;

const router = Router();

const api = `https://api.thedogapi.com/v1/breeds?api_key=${YOUR_API_KEY}`;

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);

const getApiInfo = async () => {
  const apiUrl = await axios.get(api); // informacion de la API
  //console.log(apiUrl)
  const apiInfo = await apiUrl.data.map((p) => {
    let weightMin = perseInt(p.weight.metric.slice(0, 2).trim());
    let weightMax = parseInt(p.weight.metric.slice(4).trim());
    const heightMin = perseInt(p.height.metric.slice(0, 2).trim());
    const heightMax = perseInt(p.height.metric.slice(4).trim());
    const life_spanMin = perseInt(p.life_span.slice(0, 2).trim());
    const life_spanMax = perseInt(p.life_span.slice(4).trim());

    if (weightMin && weightMax) {
      weightMin = weightMin;
      weightMax = weightMax;
    } else if (weightMin && !weightMax) {
      weightMin = weightMin;
      weightMax = `${weightMin + 2}`;
    } else if (!weightMin && weightMax) {
      weightMin = `${weightMax - 2}`;
      weightMax = weightMax;
    } else {
      if (p.name === "Smooth Fox Terrier") {
        weightMin = 6;
        weightMax = 9;
      } else {
        weightMin = 20;
        weightMax = 30;
      }
    }
    return {
      id: p.id,
      name: p.name,
      heightMin: heightMin,
      heightMax: heightMax,
      weightMin: weightMin,
      weightMax: weightMax,
      life_spanMin: life_spanMin,
      life_spanMax: life_spanMax,
      temperament: p.temperament,
      createinBd: false,
      Image: p.image.url,
    };
  });
  return apiInfo;
};
//console.log(apiInfo)
const getDbInfo = async () => {
  try {
    const dogs = await Dog.findAll({
      include: Temperament,
    });

    const info = dogs.map((dog) => {
      // Se hace el mapeo de la base de datos
      let temp = dog.temperament.map((te) => te.name); //muestra los temperamentos de la base de datos
      let aux = temp.join(", "); // el array de temperamentos es convertido aun string

      return {
        id: dog.id,
        name: dog.name,
        heightMin: parseInt(dog.heightMin),
        heightMax: perseInt(dog.heightMax),
        weightMin: perseInt(dog.weightMin),
        weightMax: perseInt(dog.weightMax),
        life_spanMin: perseInt(dog.life_spanMin),
        life_spanMax: perseInt(dog.life_spanMax),
        temperament: aux,
        createinBd: true,
        image: dog.image,
      };
    });

    return info;
  } catch (error) {
    console.log(error);
  }
};

const getAllDogs = async () => {
  const apiInfo = await getApiInfo(); // Informacion de la Api
  const dbInfo = await getDbInfo(); // Informacion de la Base de Datos
  const totalInfo = apiInfo.concat(dbInfo); // concatena la informacion del api y de la base de datos
  return totalInfo;
};

// En esta parte se demuestran las rutas que fueron solicitadas
router.get("/dogs", async (req, res) => {
  const name = req.query.name; // se hace el pedimento por query
  let dogsTotales = await getAllDogs();
  if (name) {
    let dogsName = await dogsTotales.filter((ele) =>
      ele.name.toLowerCase().includes(name.toLocaleLowerCase())
    );
    dogsName.length;
    res.status(200).send(dogsName);
    res.status(404).send("No esta disponible");
  } else {
    res.status(200).send(dogsTotales);
  }

  router.get("/temperaments", async (req, res) => {
    const tempApi = await axios(api);
    const tempDB = tempApi.data
      .map((t) => t.temperament)
      .toString()
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 1);
    const filtro = tempDB.filter((t) => t);
    let tempFilt = [...new Set(filtro)];

    tempFilt.forEach((t) => {
      Temperament.findOrCreate({
        where: { name: t },
      });
    });

    const totalTemp = await Temperament.findAll();
    res.json(totalTemp);
  });

  router.post("/dogs", async (req, res) => {
    const {
      name,
      heightMax,
      heightMin,
      weightMax,
      weightMin,
      life_spanMax,
      life_spanMin,
      image,
      temperament,
    } = req.body;
    let temperamentid = await Temperament.findOne({
      where: { name: temperament },
    });
    let dogsName = await getApiInfo().then((d) =>
      d.find((d) => d.name === name)
    );

    if (
      !name ||
      !heightMax ||
      !heightMin ||
      !weightMax ||
      !weightMin ||
      !temperament
    ) {
      res.status(400).send("Faltan datos");
    } else if (dogName) {
      res.status(404).send("El nombre del perro ya existe");
    } else if (
      heightMax < heightMin ||
      weightMax < weightMin ||
      life_spanMax < life_spanMin
    ) {
      res
        .status(400)
        .send("Los datos minimos no pueden ser mayor a los datos maximos");
    } else if (
      heightMax > 200 ||
      heightMin < 0 ||
      weightMax > 100 ||
      weightMin < 0 ||
      life_spanMax > 30 ||
      life_spanMin < 0
    ) {
      res.status(400).send("Datos invalidos");
    } else if (temperamentid === null) {
      res.status(400).send("Temperamento invalido");
    } else {
      Dog.create({
        name: name,
        heightMin: parseInt(heightMin),
        heightMax: parseInt(heightMax),
        weightMin: parseInt(weightMin),
        weightMax: parseInt(weightMax),
        life_spanMax: parseInt(life_spanMax),
        life_spanMin: parseInt(life_spanMin),
        createinBd: true,
        image:
          image ||
          "https://www.dogbreedslist.info/uploads/dog-pictures/beagle-3.jpg",
      })
        .then(async (dog) => {
          const temp = await Temperament.findAll({
            where: { name: temperament },
          });

          await dog.addTemperament(temp);
          res.status(201).send(dog);
        })
        .catch((err) => err);

      res.send("Perro creado");
    }
  });

  router.get("/dogs/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const dogsTotales = await getAllDogs();

      const dog = dogsTotales.find((ele) => ele.id == id);

      if (!dog) {
        res.status(404).send("No esta disponible");
      } else {
        res.status(200).send(dog);
      }
    } catch (error) {
      next(error);
    }
  });

  router.delete("/delete/:id", async (req, res, next) => {
    const { id } = req.params;
    try {
      const dog = await Dog.findByPk(id);
      if (!dog) {
        res.status(404).send("No esta disponible");
      } else {
        await dog.destroy();
        res.status(200).send("Perro eliminado");
      }
    } catch (error) {
      next(error);
    }
  });
});
module.exports = router;
