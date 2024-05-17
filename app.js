const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwttoken = require('jsonwebtoken')

let db = null

const app = express()

app.use(express.json())
const dbpath = path.join(__dirname, 'covid19IndiaPortal.db')

const connection = async () => {
  try {
    db = await open({filename: dbpath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Server is running')
    })
  } catch (e) {
    console.log('connection error : ' + e)
    process.exit(1)
  }
}

connection()

const check = (req, res, next) => {
  let jwt
  const header = req.headers['authorization']
  if (header != undefined) {
    jwt = header.split(' ')[1]
  }
  if (jwt === undefined) {
    res.status(401)
    res.send('Invalid JWT Token')
  } else {
    jwttoken.verify(jwt, 'secretkey', async (err, payload) => {
      if (err) {
        res.send('Invalid JWT Token')
      } else {
        //console.log('correct jwt token')
        next()
      }
    })
  }
}

app.post('/login/', async (req, res) => {
  const {username, password} = req.body

  try {
    const api1 = `SELECT * FROM user WHERE username = '${username}';`
    const user = await db.get(api1)

    if (user === undefined) {
      res.status(400)
      res.send('Invalid user')
    } else {
      const ispasswordright = await bcrypt.compare(password, user.password)
      if (!ispasswordright) {
        res.status(400)
        res.send('Invalid password')
      } else {
        const payload = {
          username: username,
        }
        const token = jwttoken.sign(payload, 'secretkey')
        res.send({token})
      }
    }
  } catch (e) {
    console.log('Internal error : ' + e)
  }
})

app.get('/states', check, async (req, res) => {
  try {
    const api2 = `SELECT * FROM state;`
    const ans = await db.all(api2)
    res.send(ans)
  } catch (e) {
    console.log('get api error : ' + e)
  }
})

app.get('/states/:stateId', check, async (req, res) => {
  const {stateId} = req.params
  const api3 = `SELECT * FROM state WHERE state_id='${stateId}';`
  const ans = await db.get(api3)
  res.send(ans)
})

app.post('/districts/', check, async (req, res) => {
  const {districtName, stateId, cases, cured, active, deaths} = req.body
  const api4 = `INSERT INTO
                    district ( district_name, state_id, cases,cured,active,deaths)
                VALUES
                    ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');`
  await db.run(api4)
  res.send('District Successfully Added')
})

app.get('/districts/:districtId/', check, async (req, res) => {
  const {districtId} = req.params
  const api5 = `SELECT * FROM district WHERE district_id = '${districtId}';`
  const ans = await db.get(api5)
  res.send(ans)
})

app.delete('/districts/:districtId/', check, async (req, res) => {
  const {districtId} = req.params
  const api6 = `DELETE FROM district WHERE district_id = '${districtId}';`
  await db.run(api6)
  res.send('District Removed')
})

app.put('/districts/:districtId/', check, async (req, res) => {
  const {districtId} = req.params
  const {districtName, stateId, cases, cured, active, deaths} = req.body
  const api7 = `UPDATE district SET district_name = '${districtName}',state_id = '${stateId}',cases = '${cases}',cured = '${cured}',active = '${active}',deaths = '${deaths}' WHERE district_id = '${districtId}';`
  await db.run(api7)
  res.send('District Details Updated')
})

app.get('/states/:stateId/stats', check, async (req, res) => {
  const {stateId} = req.params
  const api8 = `SELECT SUM(cases) AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive,SUM(deaths) AS totalDeaths FROM district WHERE state_id = '${stateId}';`
  const ans = await db.get(api8)
  res.send(ans)
})

module.exports = app
