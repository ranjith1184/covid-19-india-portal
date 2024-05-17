const express = require('express')

const app = express()

const {open} = require('sqlite')

const sqlite3 = require('sqlite3')

const path = require('path')

app.use(express.json())

const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

const bcrypt = require('bcrypt')

const jwt = require('jsonwebtoken')

let db = null

const startDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,

      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('server is running at port 3000')
    })
  } catch (e) {
    console.log(e.message)

    process.exit(1)
  }
}

startDbAndServer()

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const checkUserQuery = `SELECT * FROM user where username = '${username}';`

  const checkUser = await db.get(checkUserQuery)

  if (checkUser === undefined) {
    response.status(400)

    response.send('Invalid user')
  } else {
    const passwordCheck = await bcrypt.compare(password, checkUser.password)

    if (passwordCheck !== true) {
      response.status(400)

      response.send('Invalid password')
    } else {
      const payload = {
        username: username,
      }

      const jwtToken = jwt.sign(payload, 'MySecretKey')

      response.send({jwtToken})
    }
  }
})

const middlewareFunc = (request, response, next) => {
  let jwtToken

  const authHeader = request.headers['authorization']

  if (authHeader !== undefined) {
    //console.log(authHeader);

    jwtToken = authHeader.split(' ')[1]

    jwt.verify(jwtToken, 'MySecretKey', async (error, payload) => {
      if (error) {
        response.status(401)

        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })

    if (authHeader === undefined) {
      response.status(401)

      response.send('Invalid JWT Token')
    }
  }
}

app.get('/states/', middlewareFunc, async (request, response) => {
  const getStatesQuery = `SELECT * FROM state ORDER BY state_id`

  const getStates = await db.all(getStatesQuery)

  const getStatesResult = getStates.map(state => {
    return {
      stateId: state.state_id,

      stateName: state.state_name,

      population: state.population,
    }
  })

  response.send(getStatesResult)
})

app.get('/states/:stateId/', middlewareFunc, async (request, response) => {
  const {stateId} = request.params

  const getStateQuery = `SELECT * FROM state WHERE state_id = '${stateId}';`

  const getState = await db.get(getStateQuery)

  const getStateResult = {
    stateId: getState.state_id,

    stateName: getState.state_name,

    population: getState.population,
  }

  response.send(getStateResult)
})

app.post('/districts/', middlewareFunc, async (request, response) => {
  const requestBody = request.body

  const {districtName, stateId, cases, cured, active, deaths} = requestBody

  const districtQuery = `

  INSERT INTO district(district_name, state_id, cases, cured, active, deaths )

  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})

  `

  await db.run(districtQuery)

  response.send('District Successfully Added')
})

app.get(
  '/districts/:districtId/',

  middlewareFunc,

  async (request, response) => {
    const districtIdObject = request.params

    const {districtId} = districtIdObject

    const districtQuery = `SELECT * FROM district WHERE district_id=${districtId}`

    const dbResponse = await db.get(districtQuery)

    const dbResponseResult = {
      districtId: dbResponse.district_id,

      districtName: dbResponse.district_name,

      stateId: dbResponse.state_id,

      cases: dbResponse.cases,

      cured: dbResponse.cured,

      active: dbResponse.active,

      deaths: dbResponse.deaths,
    }

    response.send(dbResponseResult)
  },
)

app.delete(
  '/districts/:districtId/',

  middlewareFunc,

  async (request, response) => {
    const districtsIdObject = request.params

    const {districtId} = districtsIdObject

    const districtQuery = `DELETE FROM district WHERE district_id = ${districtId};`

    await db.run(districtQuery)

    response.send('District Removed')
  },
)

app.put(
  '/districts/:districtId/',

  middlewareFunc,

  async (request, response) => {
    const requestBody = request.body

    const {districtName, stateId, cases, cured, active, deaths} = requestBody

    const districtsIdObject = request.params

    const {districtId} = districtsIdObject

    const districtQuery = `

  UPDATE district SET district_name='${districtName}',state_id=${stateId},

  cases=${cases},cured=${cured},active=${active},deaths=${deaths} WHERE district_id=${districtId};

  `

    const dbResponse = await db.run(districtQuery)

    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats/',

  middlewareFunc,

  async (request, response) => {
    const statedID = request.params.stateId

    const stateQuery = `

  SELECT  SUM(cases) AS totalCases,SUM(cured) AS totalCured,

  SUM(active) AS totalActive, SUM(deaths) AS totalDeaths

  FROM state INNER JOIN district ON state.state_id=district.state_id

  WHERE state.state_id= ${statedID};

  `

    const dbResponse = await db.get(stateQuery)

    response.send(dbResponse)
  },
)

module.exports = app
