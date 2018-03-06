import * as React from 'react'
import {observer} from 'mobx-react'
import {observable, computed, action, runInAction, autorun, IReactionDisposer} from 'mobx'
import * as _ from 'lodash'
import {Prompt, Redirect} from 'react-router'
const timeago = require('timeago.js')()

import Admin from './Admin'
import AdminLayout from './AdminLayout'
import Link from './Link'
import { PageTitle, LoadingBlocker, TextField, BindString, Toggle, FieldsRow } from './Forms'
import ChartConfig from '../charts/ChartConfig'
import ChartFigureView from '../charts/ChartFigureView'
import Bounds from '../charts/Bounds'
import ChartList, { ChartListItem } from './ChartList'
import VariableList, { VariableListItem } from './VariableList'

interface Dataset {
    id: number
    name: string
    description: string
    namespace: string
    updatedAt: string
    variables: VariableListItem[]
    charts: ChartListItem[]
}

class DatasetEditable {
    @observable name: string = ""
    @observable description: string = ""

    constructor(json: Dataset) {
        for (const key in this) {
            if (key in json)
                this[key] = (json as any)[key]
        }
    }
}

@observer
class DatasetEditor extends React.Component<{ dataset: Dataset }> {
    @observable newDataset!: DatasetEditable
    @observable isDeleted: boolean = false

    // Store the original dataset to determine when it is modified
    componentWillMount() { this.componentWillReceiveProps() }
    componentWillReceiveProps() {
        this.newDataset = new DatasetEditable(this.props.dataset)
        this.isDeleted = false
    }

    @computed get isModified(): boolean {
        return JSON.stringify(this.newDataset) !== JSON.stringify(new DatasetEditable(this.props.dataset))
    }

    async save() {
        const {dataset} = this.props
        const json = await this.context.admin.requestJSON(`/api/datasets/${dataset.id}`, { dataset: this.newDataset }, "PUT")

        if (json.success) {
            Object.assign(this.props.dataset, this.newDataset)
        }
    }

    async delete() {
        const {dataset} = this.props
        if (!window.confirm(`Really delete the dataset ${dataset.name}? This action cannot be undone!`))
            return

        const json = await this.context.admin.requestJSON(`/api/datasets/${dataset.id}`, {}, "DELETE")

        if (json.success) {
            this.isDeleted = true
        }
    }

    render() {
        if (this.isDeleted)
            return <Redirect to="/datasets"/>

        const {dataset} = this.props
        const {newDataset} = this
        const isBulkImport = dataset.namespace !== 'owid'

        return <main className="DatasetEditPage">
            <PageTitle>{dataset.name}</PageTitle>
            <Prompt when={this.isModified} message="Are you sure you want to leave? Unsaved changes will be lost."/>
            <section>
                <h1>{dataset.name}</h1>
                <p>Last updated {timeago.format(dataset.updatedAt)}</p>
                <Link native to={`/../grapher/admin/datasets/${dataset.id}.csv`} className="btn btn-primary">
                    <i className="fa fa-download"/> Download CSV
                </Link>
                <Link native to={`/../grapher/admin/datasets/history/${dataset.id}`} className="btn btn-secondary">
                    <i className="fa fa-history"/> Version history
                </Link>
            </section>
            <section>
                <h3>Dataset metadata</h3>
                <form onSubmit={e => { e.preventDefault(); this.save() }}>
                    {isBulkImport ?
                        <p>This dataset came from an automated import, so we can't change the original metadata manually.</p>
                    : <p>The core metadata for the dataset. It's important to keep this in a standardized style across datasets.</p>}
                    <BindString field="name" store={newDataset} label="Name" disabled={isBulkImport} required helpText="Short name for this collection of variables, followed by the source and year. Example: Government Revenue Data – ICTD (2016)"/>
                    <BindString field="description" store={newDataset} label="Description" textarea disabled={isBulkImport}/>
                    <input type="submit" className="btn btn-success" value="Update dataset" disabled={!this.isModified}/>
                </form>
            </section>
            <section>
                <h3>Variables</h3>
                <VariableList variables={dataset.variables}/>
            </section>
            <section>
                <h3>Charts</h3>
                <ChartList charts={dataset.charts}/>
            </section>
            <section>
                <h3>Danger zone</h3>
                <p>
                    Delete this dataset and all variables it contains. If there are any charts using this data, you must delete them individually first.
                </p>
                <div className="card-footer">
                    <button className="btn btn-danger" onClick={() => this.delete()}>Delete dataset</button>
                </div>
            </section>
        </main>
    }
}

@observer
export default class DatasetEditPage extends React.Component<{ datasetId: number }> {
    context!: { admin: Admin }
    @observable dataset?: Dataset

    render() {
        return <AdminLayout>
            {this.dataset && <DatasetEditor dataset={this.dataset}/>}
        </AdminLayout>
    }

    async getData() {
        const json = await this.context.admin.getJSON(`/api/datasets/${this.props.datasetId}.json`)
        runInAction(() => {
            this.dataset = json.dataset as Dataset
        })
    }

    componentDidMount() { this.componentWillReceiveProps() }
    componentWillReceiveProps() {
        this.getData()
    }
}
