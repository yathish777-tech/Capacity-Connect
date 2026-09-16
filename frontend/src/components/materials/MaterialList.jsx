import { FileText } from 'lucide-react'
import EmptyState from '../EmptyState'
import Loader from '../Loader'
import MaterialCard from './MaterialCard'

export default function MaterialList({ materials, courseTitleById = {}, onView, onDownload, onReplace, onDelete, busyId }) {
  if (materials === null) return <Loader label="Loading materials..." />

  if (!materials?.length) {
    return <EmptyState icon={FileText} title="No materials found" />
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {materials.map((material) => (
        <MaterialCard
          key={material.id}
          material={material}
          courseTitle={courseTitleById[material.course_id]}
          onView={onView}
          onDownload={onDownload}
          onReplace={onReplace}
          onDelete={onDelete}
          busy={busyId === material.id}
        />
      ))}
    </div>
  )
}
