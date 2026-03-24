function ControlButtons({
  isRunning,
  onToggleSimulation,
  onTriggerFailure,
  onRestoreSystem,
}) {
  return (
    <section className="control-strip">
      <button className="action-button action-primary" onClick={onToggleSimulation}>
        {isRunning ? 'Pause simulation' : 'Resume simulation'}
      </button>
      <button className="action-button action-danger" onClick={onTriggerFailure}>
        Trigger failure
      </button>
      <button className="action-button action-secondary" onClick={onRestoreSystem}>
        Restore system
      </button>
    </section>
  )
}

export default ControlButtons
