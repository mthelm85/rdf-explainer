<h2 id="start">Where to start</h2>

<p>
	The standards for this already exist. Some are RDF vocabularies from the start; others publish
	JSON-LD or map cleanly to RDF.
</p>

<dl>
	<dt>Jobs and skills</dt>
	<dd>
		<a href="https://schema.org/JobPosting">schema.org</a> for job postings, and
		<a href="https://www.w3.org/TR/skos-reference/">SKOS</a>, the W3C standard for publishing
		taxonomies, for skill frameworks such as
		<a href="https://esco.ec.europa.eu/">ESCO</a>.
	</dd>

	<dt>Credentials and competencies</dt>
	<dd>
		<a href="https://credreg.net/ctdl/handbook">CTDL</a>, the Credential Transparency Description
		Language, for credentials, competencies and pathways, and
		<a href="https://www.1edtech.org/standards/case">CASE</a>, Competencies and Academic Standards
		Exchange, for competency frameworks and academic standards.
	</dd>

	<dt>Learner records</dt>
	<dd>
		<a href="https://www.imsglobal.org/spec/ob/v3p0/">Open Badges 3.0</a> for individual
		achievements and the <a href="https://www.imsglobal.org/spec/clr/v2p0/">Comprehensive Learner
		Record</a> for full transcripts, both built on W3C
		<a href="https://www.w3.org/TR/vc-data-model-2.0/">Verifiable Credentials</a>.
	</dd>

	<dt>Education data</dt>
	<dd>
		<a href="https://ceds.ed.gov/">CEDS</a>, the Common Education Data Standards, a shared
		vocabulary for education and workforce data that is also published as an RDF ontology.
	</dd>
</dl>

<p>
	For most organizations the first step is small: publish the data they already have as JSON-LD,
	with an <code>@context</code> that maps their keys to one of these vocabularies, as in the
	<a href="#syntax">examples above</a>.
</p>

<style>
	dl {
		margin: 0 0 1rem;
	}

	dt {
		font-weight: 600;
		margin-top: 0.75rem;
	}

	dd {
		margin: 0.15rem 0 0;
	}
</style>
