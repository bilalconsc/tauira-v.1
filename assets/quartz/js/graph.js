// graph.js v2 — baseUrl URL constructor patched (try/catch active)
async function drawGraph(baseUrl, isHome, pathColors, graphConfig) {
  let {
  depth,
  enableDrag,
  enableLegend,
  enableZoom,
  opacityScale,
  scale,
  repelForce,
  fontSize} = graphConfig;

  const container = document.getElementById("graph-container")
  if (!container) return

  const { index, links, content } = await fetchData

  // Safely derive siteBase — works whether baseUrl is absolute or a plain path
  let siteBase
  try {
    siteBase = new URL(baseUrl).pathname.replace(/\/$/, "")
  } catch {
    siteBase = baseUrl.replace(/\/$/, "")
  }

  const rawPage = window.location.pathname.replace(/\/$/, "")
  const curPage = rawPage.startsWith(siteBase)
    ? rawPage.slice(siteBase.length) || "/"
    : rawPage

  // Normalise an id for content lookup: strip leading slash
  const normaliseId = (id) => id.replace(/^\//, "")

  const parseIdsFromLinks = (links) => [
    ...new Set(links.flatMap((link) => [link.source, link.target])),
  ]

  const copyLinks = JSON.parse(JSON.stringify(links))

  const neighbours = new Set()
  const wl = [curPage || "/", "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      const cur = wl.shift()
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbours.add(cur)
        const outgoing = index.links[cur] || []
        const incoming = index.backlinks[cur] || []
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    parseIdsFromLinks(copyLinks).forEach((id) => neighbours.add(id))
  }

  const data = {
    nodes: [...neighbours].map((id) => ({ id })),
    links: copyLinks.filter((l) => neighbours.has(l.source) && neighbours.has(l.target)),
  }

  const color = (d) => {
    if (d.id === curPage || (d.id === "/" && curPage === "/")) {
      return "var(--g-node-active)"
    }
    for (const pathColor of pathColors) {
      const path = Object.keys(pathColor)[0]
      const colour = pathColor[path]
      if (d.id.startsWith(path)) {
        return colour
      }
    }
    return "var(--g-node)"
  }

  const drag = (simulation) => {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(1).restart()
      d.fx = d.x
      d.fy = d.y
    }
    function dragged(event, d) {
      d.fx = event.x
      d.fy = event.y
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }
    const noop = () => {}
    return d3
      .drag()
      .on("start", enableDrag ? dragstarted : noop)
      .on("drag",  enableDrag ? dragged     : noop)
      .on("end",   enableDrag ? dragended   : noop)
  }

  // Ensure the container has a rendered size before we read it
  const height = Math.max(container.offsetHeight || 0, isHome ? 500 : 250)
  const width  = Math.max(container.offsetWidth  || 0, 300)

  const simulation = d3
    .forceSimulation(data.nodes)
    .force("charge", d3.forceManyBody().strength(-100 * repelForce))
    .force(
      "link",
      d3
        .forceLink(data.links)
        .id((d) => d.id)
        .distance(40),
    )
    .force("center", d3.forceCenter())
    .force("x", d3.forceX().strength(0.05))
    .force("y", d3.forceY().strength(0.05))

  const svg = d3
    .select("#graph-container")
    .append("svg")
    .attr("width",   width)
    .attr("height",  height)
    // Add padding so labels near edges are not clipped
    .attr("viewBox", [-width / 2 / scale, -height / 2 / scale, width / scale, height / scale])
    .style("overflow", "visible")

  if (enableLegend) {
    const legend = [{ Current: "var(--g-node-active)" }, { Note: "var(--g-node)" }, ...pathColors]
    legend.forEach((legendEntry, i) => {
      const key    = Object.keys(legendEntry)[0]
      const colour = legendEntry[key]
      svg.append("circle")
        .attr("cx", -width / 2 + 20)
        .attr("cy", height / 2 - 30 * (i + 1))
        .attr("r", 6)
        .style("fill", colour)
      svg.append("text")
        .attr("x", -width / 2 + 40)
        .attr("y", height / 2 - 30 * (i + 1))
        .text(key)
        .style("font-size", "15px")
        .attr("alignment-baseline", "middle")
    })
  }

  const link = svg
    .append("g")
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "var(--g-link)")
    .attr("stroke-width", 2)
    .attr("data-source", (d) => d.source.id)
    .attr("data-target", (d) => d.target.id)

  const graphNode = svg.append("g").selectAll("g").data(data.nodes).enter().append("g")

  const nodeRadius = (d) => {
    const numOut = index.links[d.id]?.length || 0
    const numIn  = index.backlinks[d.id]?.length || 0
    return 2 + Math.sqrt(numOut + numIn)
  }

  // Helper: build a safe absolute URL for a node id
  function nodeUrl(id) {
    return baseUrl.replace(/\/$/, "") + "/" + decodeURI(id).replace(/^\//, "").replace(/\s+/g, "-") + "/"
  }

  // Helper: look up a node title from the content index
  // The content index may key pages with or without a leading slash,
  // so we try both forms before falling back to a prettified id.
  function nodeTitle(id) {
    const withSlash    = id.startsWith("/") ? id : "/" + id
    const withoutSlash = id.replace(/^\//, "")
    const entry = content[id] || content[withSlash] || content[withoutSlash]
    if (entry?.title) return entry.title
    // Prettify the raw path segment as a last resort
    return withoutSlash.split("/").pop().replace(/-/g, " ")
  }

  const node = graphNode
    .append("circle")
    .attr("class", "node")
    .attr("id",    (d) => d.id)
    .attr("r",     nodeRadius)
    .attr("fill",  color)
    .style("cursor", "pointer")
    .on("click", (_, d) => {
      window.location.href = nodeUrl(d.id)
    })
    .on("mouseover", function (_, d) {
      d3.selectAll(".node").transition().duration(100).attr("fill", "var(--g-node-inactive)")

      const neighbourIds = parseIdsFromLinks([
        ...(index.links[d.id]     || []),
        ...(index.backlinks[d.id] || []),
      ])
      const neighbourNodes = d3.selectAll(".node").filter((d) => neighbourIds.includes(d.id))
      const currentId = d.id

      const linkNodes = d3
        .selectAll(".link")
        .filter((d) => d.source.id === currentId || d.target.id === currentId)

      neighbourNodes.transition().duration(200).attr("fill", color)
      linkNodes.transition().duration(200).attr("stroke", "var(--g-link-active)")

      const bigFont = fontSize * 1.5
      d3.select(this.parentNode)
        .raise()
        .select("text")
        .transition().duration(200)
        .attr("opacityOld", d3.select(this.parentNode).select("text").style("opacity"))
        .style("opacity", 1)
        .style("font-size", bigFont + "em")
        .attr("dy", (d) => nodeRadius(d) + 20 + "px")
    })
    .on("mouseleave", function (_, d) {
      d3.selectAll(".node").transition().duration(200).attr("fill", color)

      const currentId = d.id
      const linkNodes = d3
        .selectAll(".link")
        .filter((d) => d.source.id === currentId || d.target.id === currentId)

      linkNodes.transition().duration(200).attr("stroke", "var(--g-link)")

      d3.select(this.parentNode)
        .select("text")
        .transition().duration(200)
        .style("opacity", d3.select(this.parentNode).select("text").attr("opacityOld"))
        .style("font-size", fontSize + "em")
        .attr("dy", (d) => nodeRadius(d) + 8 + "px")
    })
    .call(drag(simulation))

  const labels = graphNode
    .append("text")
    .attr("dx", 0)
    .attr("dy", (d) => nodeRadius(d) + 8 + "px")
    .attr("text-anchor", "middle")
    .text((d) => nodeTitle(d.id))
    .style("opacity", (opacityScale - 1) / 3.75)
    .style("pointer-events", "none")
    .style("font-size", fontSize + "em")
    .raise()
    .call(drag(simulation))

  if (enableZoom) {
    svg.call(
      d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.25, 4])
        .on("zoom", ({ transform }) => {
          link.attr("transform", transform)
          node.attr("transform", transform)
          const s = transform.k * opacityScale
          const scaledOpacity = Math.max((s - 1) / 3.75, 0)
          labels.attr("transform", transform).style("opacity", scaledOpacity)
        }),
    )
  }

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y)
    labels.attr("x", (d) => d.x).attr("y", (d) => d.y)
  })
}
