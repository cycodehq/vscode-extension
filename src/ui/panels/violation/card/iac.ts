export default `
<section class="card">
  <section class="header">
    <div class="severity">
        <img class="severity-icon" alt="Severity" />
    </div>
    <div class="title">None</div>
    <div class="short-details"></div>
  </section>

  <section class="hr details">
    <div class="details-item">
      <div class="details-item-title">In file:</div>
      <div class="details-item-value file">None</div>
    </div>
    <div class="details-item">
      <div class="details-item-title">IaC Provider:</div>
      <div class="details-item-value provider">None</div>
    </div>
    <div class="details-item">
      <div class="details-item-title">Rule ID:</div>
      <div class="details-item-value rule">None</div>
    </div>
  </section>

  <section class="hr compact-first">
    <div class="section-header">Summary</div>
    <div class="summary-text">None</div>
  </section>

  <section class="company-guidelines compact">
    <div class="section-header">Company Guidelines</div>
    <div class="company-guidelines-text">None</div>
  </section>

  <section class="cycode-guidelines compact">
    <div class="section-header">Cycode Guidelines</div>
    <div class="cycode-guidelines-text">None</div>
  </section>

  <section class="ai-remediation compact">
    <div class="section-header">AI Remediation</div>
    <div class="ai-remediation-text">None</div>
    <div class="ai-remediation-diff">None</div>
  </section>

  <section class="hr section-footer">
    <button class="ai-remediation-btn">Generate AI Remediation</button>
    <button class="ai-apply-fix-btn">Apply AI suggested fix</button>
  </section>
</section>
`;
