function AlertBox({ alert }) {
  if (!alert) {
    return (
      <article className="panel alert-panel alert-clear">
        <p className="eyebrow">Alerts</p>
        <h2>All clear</h2>
        <p className="panel-copy">
          No active temperature excursions. ColdGuard is operating in the safe transport
          zone.
        </p>
      </article>
    )
  }

  return (
    <article className="panel alert-panel alert-active">
      <p className="eyebrow">Alerts</p>
      <h2>{alert.title}</h2>
      <p className="panel-copy">{alert.detail}</p>
    </article>
  )
}

export default AlertBox
