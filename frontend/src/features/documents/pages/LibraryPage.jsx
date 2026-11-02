import { Library } from '../components/Library'

export default function LibraryPage() {
  return (
    <div className="sm-rise">
      <header className="sm-pagehead">
        <h1 className="display-lg">Seus PDFs</h1>
        <p className="body-lg">Envie PDFs e converse com cada um deles.</p>
      </header>
      <Library />
    </div>
  )
}
