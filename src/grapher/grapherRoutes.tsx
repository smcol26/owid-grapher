import * as express from 'express'
import * as React from 'react'
import * as _ from 'lodash'

import {webpack, embedSnippet} from '../staticGen'
import {chartToSVG, chartToPNG} from './svgPngExport'
import Chart from '../models/Chart'
import { getVariableData } from '../models/Variable'
import db from '../db'
import {renderToHtmlPage, expectInt} from '../admin/serverUtil'
import ChartPage from './ChartPage'

const grapher = express()

grapher.get('/embedCharts.js', async (req, res) => {
    res.send(embedSnippet())
})

grapher.get('/data/variables/:variableIds.json', async (req, res) => {
    const variableIds = req.params.variableIds.split("+").map((s: string) => expectInt(s))
    const vardata = await getVariableData(variableIds)
    res.send(vardata)
})

grapher.get('/exports/:slug.svg', async (req, res) => {
    const chart = await Chart.getBySlug(req.params.slug)
    const vardata = await getVariableData(chart.variableIds)

    res.set('Content-Type', 'image/svg+xml')
    res.send(await chartToSVG(chart.config, vardata))
})

grapher.get('/exports/:slug.png', async (req, res) => {
    const chart = await Chart.getBySlug(req.params.slug)
    const vardata = await getVariableData(chart.variableIds)

    res.set('Content-Type', 'image/png')
    res.send(await chartToPNG(chart.config, vardata))
})

grapher.get('/:slug', async (req, res) => {
    const chart = await Chart.getBySlug(req.params.slug)
    res.send(renderToHtmlPage(<ChartPage chart={chart.config}/>))
})

export default grapher