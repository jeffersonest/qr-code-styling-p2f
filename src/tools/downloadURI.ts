export default function downloadURI(dom: Document, uri: string, name: string): void {
  const link = dom.createElement("a");
  link.download = name;
  link.href = uri;
  dom.body.appendChild(link);
  link.click();
  dom.body.removeChild(link);
}
