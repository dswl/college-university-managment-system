const express = require('express');
const app = express();
const path = require('path');
const hbs = require('hbs');
const https = require('https');

hbs.registerPartials(`${__dirname}/views/partials`)
app.set('view engine', 'hbs');

require('dotenv').config()

app.use(express.static('static'))

const KEY = process.env.KEY

const collegeList = new Set()
let totalPages = 0

hbs.registerHelper('add', function(a, b) {
    return a + b
})

hbs.registerHelper('subtract', function(a, b) {
    return a - b
})

hbs.registerHelper('calc_act', function(a, b) {
    return Math.floor((a + b) / 2)
})

hbs.registerHelper('find_left', function(score, max) {
    return (score/max*100)-50
})

hbs.registerHelper('find_width', function(start, end, max) {
    return (end-start)/max*100
})

hbs.registerHelper('start_left', function(start, max) {
    return (start/max)*100
})

hbs.registerHelper('if_uva', function(name) {
    if (name === "University of Virginia-Main Campus") return true
    return false
})

hbs.registerHelper('if_cornell', function(name) {
    if (name === "Cornell University") return true
    return false
})

async function getTotalPages() {
    return new Promise(async function(resolve, reject) {
        https.get(`https://api.data.gov/ed/collegescorecard/v1/schools?fields=school.name&api_key=m4qEjprQZTAgkVmj2li2owsgmEHk4ZDmoSOtLkif`, (response) => {
            let data = ''
            response.on('data', (chunk) => {
                data += chunk
            })
            response.on('end', () => {
                const parsedData = JSON.parse(data)
                totalPages = parseInt(parseInt(parsedData.metadata.total) / parseInt(parsedData.metadata.per_page))
                resolve(1)
            })
        })
    })
}

async function getAllColleges() {
    return new Promise(async function(resolve, reject) {
        for (let page = 0; page < totalPages; page++) {
            https.get(`https://api.data.gov/ed/collegescorecard/v1/schools?fields=school.name&api_key=${KEY}&page=${page}`, (response) => {
                let data = ''
                response.on('data', (chunk) => {
                    data += chunk
                })
                response.on('end', () => {
                    const parsedData = JSON.parse(data)
                    for (let i = 0; i < parsedData.results.length; i++) {
                        collegeList.add(parsedData.results[i]["school.name"])
                    }
                    resolve(1)
                })
            })
        }
    })
}

async function start() {
    await getTotalPages()
    await getAllColleges()
}
// start()

console.log(collegeList)

async function getCollegeInfo(req, res, next) {
    https.get(`https://api.data.gov/ed/collegescorecard/v1/schools?school.name=${req.query.name}&fields=school.name,school.state,school.city,latest.admissions.admission_rate.overall,school.school_url,latest.admissions.act_scores.25th_percentile,latest.admissions.act_scores.midpoint,latest.admissions.act_scores.75th_percentile,latest.admissions.sat_scores.25th_percentile,latest.admissions.sat_scores.midpoint,latest.admissions.sat_scores.75th_percentile,latest.cost.avg_net_price.overall&api_key=${KEY}`, (response) => {
        let data = ''
        response.on('data', (chunk) => {
            data += chunk
        })
        response.on('end', () => {
            const parsedData = JSON.parse(data)
            if (parsedData.metadata.total === 0) {
                console.log("no matches")
                res.redirect('/')
            }
            else {
                let currentIndex = 0
                for (let i = 0; i < parsedData.results.length; i++) {
                    if (parsedData.results[i]["school.name"] === req.query.name) {
                        currentIndex = i
                        break
                    }
                }
                res.locals.collegeInfo = {
                    name : parsedData.results[currentIndex]["school.name"],
                    state : parsedData.results[currentIndex]["school.state"],
                    city : parsedData.results[currentIndex]["school.city"],
                    accRate : (parsedData.results[currentIndex]["latest.admissions.admission_rate.overall"] * 100.0).toFixed(2),
                    schoolWebsite : parsedData.results[currentIndex]["school.school_url"].includes("https") ? parsedData.results[currentIndex]["school.school_url"] : `https://${parsedData.results[currentIndex]["school.school_url"]}`,
                    schoolSize: parsedData.results[currentIndex]["latest.school.student.size"],
                    averageNetPrice : parsedData.results[currentIndex]["latest.cost.avg_net_price.overall"],
                    actScores : {english: [parseInt(parsedData.results[currentIndex]["latest.admissions.act_scores.25th_percentile.english"]), parseInt(parsedData.results[currentIndex]["latest.admissions.act_scores.midpoint.english"]), parseInt(parsedData.results[currentIndex]["latest.admissions.act_scores.75th_percentile.english"])], math: [parseInt(parsedData.results[currentIndex]["latest.admissions.act_scores.25th_percentile.math"]), parseInt(parsedData.results[currentIndex]["latest.admissions.act_scores.midpoint.math"]), parseInt(parsedData.results[currentIndex]["latest.admissions.act_scores.75th_percentile.math"])]},
                    satScores : {english: [parseInt(parsedData.results[currentIndex]["latest.admissions.sat_scores.25th_percentile.critical_reading"]), parseInt(parsedData.results[currentIndex]["latest.admissions.sat_scores.midpoint.critical_reading"]), parseInt(parsedData.results[currentIndex]["latest.admissions.sat_scores.75th_percentile.critical_reading"])], math: [parseInt(parsedData.results[currentIndex]["latest.admissions.sat_scores.25th_percentile.critical_reading"]), parseInt(parsedData.results[currentIndex]["latest.admissions.sat_scores.midpoint.critical_reading"]), parseInt(parsedData.results[currentIndex]["latest.admissions.sat_scores.75th_percentile.critical_reading"])]},
                }

                next()
            }
        })
    }).on('error', (err) => {
        res.redirect('/')
    })
}

app.get('/', function(req, res) {
    res.render('index')
})

app.get('/collegePage', [getCollegeInfo], function(req, res) {
    res.render('collegePage', {collegeInfo: res.locals.collegeInfo})
})

app.get('/essays', function(req, res) {
    res.render('essays')
})

app.get('/extracurriculars', function(req, res) {
    res.render('extracurriculars')
})

app.get('/dnu', function(req, res) {
    res.render('dnu')
})

const listener = app.listen(process.env.PORT || 80, process.env.HOST || "0.0.0.0", function() {
    console.log("Express server started");
})
