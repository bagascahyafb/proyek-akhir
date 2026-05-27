import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function LoadingTwotoneLoop(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path strokeDasharray="18" d="M12 3c4.97 0 9 4.03 9 9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="18;0"></animate>
          <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"></animateTransform>
        </path>
        <path strokeDasharray="60" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z" opacity=".3">
          <animate fill="freeze" attributeName="stroke-dashoffset" dur="1.2s" values="60;0">
            </animate>
        </path>
      </g>
    </svg>
  );
}

export function DarkTheme(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12.741 20.917a9.4 9.4 0 0 1-1.395-.105a9.141 9.141 0 0 1-1.465-17.7a1.18 1.18 0 0 1 1.21.281a1.27 1.27 0 0 1 .325 1.293a8.1 8.1 0 0 0-.353 2.68a8.27 8.27 0 0 0 4.366 6.857a7.6 7.6 0 0 0 3.711.993a1.242 1.242 0 0 1 .994 1.963a9.15 9.15 0 0 1-7.393 3.738M10.261 4.05a.2.2 0 0 0-.065.011a8.137 8.137 0 1 0 9.131 12.526a.22.22 0 0 0 .013-.235a.23.23 0 0 0-.206-.136a8.6 8.6 0 0 1-4.188-1.116a9.27 9.27 0 0 1-4.883-7.7a9.1 9.1 0 0 1 .4-3.008a.29.29 0 0 0-.069-.285a.18.18 0 0 0-.133-.057"/>
    </svg>
  );
}

export function LightTheme(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 32 32" {...props}>
      <path fill="currentColor" d="M15 2h2v5h-2zm6.688 6.9l3.506-3.506l1.414 1.414l-3.506 3.506zM25 15h5v2h-5zm-3.312 8.1l1.414-1.413l3.506 3.506l-1.414 1.414zM15 25h2v5h-2zm-9.606.192L8.9 21.686l1.414 1.414l-3.505 3.506zM2 15h5v2H2zm3.395-8.192l1.414-1.414L10.315 8.9L8.9 10.314zM16 12a4 4 0 1 1-4 4a4.005 4.005 0 0 1 4-4m0-2a6 6 0 1 0 6 6a6 6 0 0 0-6-6"/>
    </svg>
  );
}

export function FileUploadOutline(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M4.25 5A2.75 2.75 0 0 1 7 2.25h7.987a1.75 1.75 0 0 1 1.422.73l3.013 4.197c.213.298.328.655.328 1.02V19A2.75 2.75 0 0 1 17 21.75H7A2.75 2.75 0 0 1 4.25 19zM7 3.75c-.69 0-1.25.56-1.25 1.25v14c0 .69.56 1.25 1.25 1.25h10c.69 0 1.25-.56 1.25-1.25V8.897H15a.75.75 0 0 1-.75-.75V3.75z" clipRule="evenodd" />
      <path fill="currentColor" d="M15.086 13.219a.75.75 0 0 1-1.055.117l-1.28-1.026v3.44a.75.75 0 0 1-1.5 0v-3.44l-1.282 1.026a.75.75 0 0 1-.937-1.172l2.497-1.998a.75.75 0 0 1 .465-.166h.008c.18 0 .344.064.473.17l2.494 1.994a.75.75 0 0 1 .117 1.055" />
    </svg>
  );
}

export function FileSearchIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <circle cx="11.5" cy="14.5" r="3.5" />
        <path d="m4 22l5-5m-5-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2h-7" />
      </g>
    </svg>
  );
}

export function FilePdfIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M18.53 9L13 3.47a.75.75 0 0 0-.53-.22H8A2.75 2.75 0 0 0 5.25 6v12A2.75 2.75 0 0 0 8 20.75h8A2.75 2.75 0 0 0 18.75 18V9.5a.75.75 0 0 0-.22-.5m-5.28-3.19l2.94 2.94h-2.94ZM16 19.25H8A1.25 1.25 0 0 1 6.75 18V6A1.25 1.25 0 0 1 8 4.75h3.75V9.5a.76.76 0 0 0 .75.75h4.75V18A1.25 1.25 0 0 1 16 19.25" />
      <path fill="currentColor" d="M13.49 14.85a3.15 3.15 0 0 1-1.31-1.66a4.44 4.44 0 0 0 .19-2a.8.8 0 0 0-1.52-.19a5 5 0 0 0 .25 2.4A29 29 0 0 1 9.83 16c-.71.4-1.68 1-1.83 1.69c-.12.56.93 2 2.72-1.12a19 19 0 0 1 2.44-.72a4.7 4.7 0 0 0 2 .61a.82.82 0 0 0 .62-1.38c-.42-.43-1.67-.31-2.29-.23m-4.78 3a4.3 4.3 0 0 1 1.09-1.24c-.68 1.08-1.09 1.27-1.09 1.25Zm2.92-6.81c.26 0 .24 1.15.06 1.46a3.1 3.1 0 0 1-.06-1.45Zm-.87 4.88a15 15 0 0 0 .88-1.92a3.9 3.9 0 0 0 1.08 1.26a12.4 12.4 0 0 0-1.96.67Zm4.7-.18s-.18.22-1.33-.28c1.25-.08 1.46.21 1.33.29Z" />
    </svg>
  );
}

export function FileWordIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="m18.53 8.97l-5.5-5.5a.75.75 0 0 0-.53-.22H8C6.48 3.25 5.25 4.48 5.25 6v12c0 1.52 1.23 2.75 2.75 2.75h8c1.52 0 2.75-1.23 2.75-2.75V9.5c0-.2-.08-.39-.22-.53m-5.28-3.16l2.94 2.94h-2.94zM16 19.25H8c-.69 0-1.25-.56-1.25-1.25V6c0-.69.56-1.25 1.25-1.25h3.75V9.5c0 .41.34.75.75.75h4.75V18c0 .69-.56 1.25-1.25 1.25m.22-6.53l-1.5 5c-.09.3-.37.52-.69.53H14c-.31 0-.58-.19-.7-.47L12 14.52l-1.3 3.26c-.12.3-.41.49-.73.47a.76.76 0 0 1-.69-.53l-1.5-5a.748.748 0 0 1 1.43-.43l.88 2.94l1.2-3.01c.23-.57 1.17-.57 1.39 0l1.2 3.01l.88-2.94c.12-.4.54-.62.93-.5c.4.12.62.54.5.93Z" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="m16.475 5.408l2.117 2.117m-.756-3.982L12.109 9.27a2.1 2.1 0 0 0-.58 1.082L11 13l2.648-.53c.41-.082.786-.283 1.082-.579l5.727-5.727a1.853 1.853 0 1 0-2.621-2.621" />
        <path d="M19 15v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3" />
      </g>
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    </svg>
  );
}

export function FileAiIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M10 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v4" />
        <path d="M14 21v-4a2 2 0 1 1 4 0v4m-4-2h4m3-4v6" />
      </g>
    </svg>
  );
}

export function FileAttachmentIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M4 12v2.545c0 3.245 0 4.867.886 5.966a4 4 0 0 0 .603.603C6.59 22 8.211 22 11.456 22c.705 0 1.058 0 1.381-.114q.1-.034.197-.081c.31-.148.559-.398 1.058-.896l4.736-4.737c.579-.578.867-.867 1.02-1.235c.152-.367.152-.776.152-1.593V10c0-3.77 0-5.656-1.172-6.828c-1.059-1.06-2.701-1.16-5.793-1.17M13 21.5V21c0-2.828 0-4.242.879-5.12C14.757 15 16.172 15 19 15h.5" />
        <path d="M4 8.23V5.461C4 3.55 5.567 2 7.5 2S11 3.55 11 5.46v3.81A1.74 1.74 0 0 1 9.25 11A1.74 1.74 0 0 1 7.5 9.27V5.46" />
      </g>
    </svg>
  );
}

export function AutoEnhanceIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="64" height="64" viewBox="0 0 2048 2048" {...props}>
      <path fill="currentColor" d="M0 1984q0-26 19-45L1235 723q19-19 45-19t45 19t19 45t-19 45L109 2029q-19 19-45 19t-45-19t-19-45M1408 0h128v256h-128zm-207 395l-182-181l91-91l181 182zm-49 245H896V512h256zm256 256h128v256h-128zm335-139l182 181l-91 91l-181-182zm305-245v128h-256V512zm-305-117l-90-90l181-182l91 91zm-271 117q26 0 45 19t19 45t-19 45t-45 19t-45-19t-19-45t19-45t45-19" />
    </svg>
  );
}

export function ArrowBackwardIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24" {...props}>
      <g transform="translate(24 0) scale(-1 1)">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="m16 5l5 5l-5 5" />
          <path d="M21 10h-8C7.477 10 3 14.477 3 20v1" />
        </g>
      </g>
    </svg>
  );
}

export function ArrowForwardIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="m16 5l5 5l-5 5" />
        <path d="M21 10h-8C7.477 10 3 14.477 3 20v1" />
      </g>
    </svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0" />
    </svg>
  );
}
