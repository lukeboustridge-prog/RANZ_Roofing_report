/**
 * Photo Appendix Section
 *
 * Full-size photographs organized by category with metadata
 * Provides comprehensive photographic documentation for legal proceedings
 */

import { Page, View, Text, Image } from "../react-pdf-wrapper";
import { styles, colors } from "../styles";
import { Header, Footer } from "../components";

interface PhotoData {
  id: string;
  url: string;
  caption?: string | null;
  photoType?: string;
  filename?: string;
  originalHash?: string;
  capturedAt?: Date | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  defectId?: string | null;
  roofElementId?: string | null;
}

interface DefectData {
  id: string;
  defectNumber: number;
  title: string;
  location: string;
}

interface ElementData {
  id: string;
  elementType: string;
  location: string;
}

interface PhotoAppendixProps {
  reportNumber: string;
  photos: PhotoData[];
  defects?: DefectData[];
  elements?: ElementData[];
}

const appendixStyles = {
  page: {
    ...styles.page,
    paddingTop: 80,
    paddingBottom: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 5,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    color: colors.charcoalLight,
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.charcoal,
  },
  sectionHeader: {
    backgroundColor: colors.charcoal,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.white,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  photoGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    marginBottom: 10,
  },
  photoContainer: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 15,
  },
  photoContainerFull: {
    width: "100%",
    marginBottom: 15,
  },
  photoImage: {
    width: "100%",
    height: 180,
    objectFit: "cover" as const,
    backgroundColor: colors.backgroundLight,
  },
  photoImageFull: {
    width: "100%",
    height: 280,
    objectFit: "contain" as const,
    backgroundColor: colors.backgroundLight,
  },
  photoMeta: {
    backgroundColor: colors.backgroundLight,
    padding: 8,
    borderBottomWidth: 3,
    borderBottomColor: colors.charcoal,
  },
  photoNumber: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 2,
  },
  photoCaption: {
    fontSize: 9,
    color: colors.charcoal,
    marginBottom: 4,
    lineHeight: 1.3,
  },
  photoDetails: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  photoDetail: {
    fontSize: 7,
    color: colors.charcoalLight,
    marginRight: 10,
  },
  photoTypeBadge: {
    fontSize: 7,
    fontWeight: 700,
    color: colors.white,
    backgroundColor: colors.charcoal,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 4,
    alignSelf: "flex-start" as const,
  },
  indexTable: {
    marginBottom: 20,
  },
  indexHeader: {
    flexDirection: "row" as const,
    backgroundColor: colors.charcoal,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  indexHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.white,
    textTransform: "uppercase" as const,
  },
  indexRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  indexRowAlt: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.backgroundLight,
  },
  indexCell: {
    fontSize: 8,
    color: colors.charcoal,
  },
  noPhotos: {
    fontSize: 10,
    color: colors.charcoalLight,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    padding: 20,
  },
  pageBreak: {
    marginTop: 20,
  },
};

function formatPhotoType(type: string | undefined): string {
  if (!type) return "General";
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-NZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGPS(lat: number | null | undefined, lng: number | null | undefined): string {
  if (!lat || !lng) return "—";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Group photos by category
function groupPhotos(
  photos: PhotoData[],
  defects: DefectData[],
  elements: ElementData[]
): {
  defectPhotos: Map<string, { defect: DefectData; photos: PhotoData[] }>;
  elementPhotos: Map<string, { element: ElementData; photos: PhotoData[] }>;
  generalPhotos: PhotoData[];
} {
  const defectPhotos = new Map<string, { defect: DefectData; photos: PhotoData[] }>();
  const elementPhotos = new Map<string, { element: ElementData; photos: PhotoData[] }>();
  const generalPhotos: PhotoData[] = [];

  // Initialize defect groups
  defects.forEach((defect) => {
    defectPhotos.set(defect.id, { defect, photos: [] });
  });

  // Initialize element groups
  elements.forEach((element) => {
    elementPhotos.set(element.id, { element, photos: [] });
  });

  // Sort photos into groups
  photos.forEach((photo) => {
    if (photo.defectId && defectPhotos.has(photo.defectId)) {
      defectPhotos.get(photo.defectId)!.photos.push(photo);
    } else if (photo.roofElementId && elementPhotos.has(photo.roofElementId)) {
      elementPhotos.get(photo.roofElementId)!.photos.push(photo);
    } else {
      generalPhotos.push(photo);
    }
  });

  return { defectPhotos, elementPhotos, generalPhotos };
}

// Photo Index Page
function PhotoIndexPage({
  reportNumber,
  photos,
}: {
  reportNumber: string;
  photos: PhotoData[];
}) {
  const displayPhotos = photos.slice(0, 40);
  const hasMore = photos.length > 40;

  return (
    <Page size="A4" style={appendixStyles.page}>
      <Header reportNumber={reportNumber} />

      <Text style={appendixStyles.title}>Appendix C: Photo Index</Text>
      <Text style={appendixStyles.subtitle}>
        Complete index of all photographs captured during inspection
      </Text>

      <View style={appendixStyles.indexTable}>
        <View style={appendixStyles.indexHeader}>
          <Text style={[appendixStyles.indexHeaderCell, { width: 25 }]}>#</Text>
          <Text style={[appendixStyles.indexHeaderCell, { width: 80 }]}>
            Type
          </Text>
          <Text style={[appendixStyles.indexHeaderCell, { flex: 1 }]}>
            Caption / Description
          </Text>
          <Text style={[appendixStyles.indexHeaderCell, { width: 75 }]}>
            Captured
          </Text>
          <Text style={[appendixStyles.indexHeaderCell, { width: 50 }]}>
            GPS
          </Text>
        </View>
        {displayPhotos.map((photo, index) => (
          <View
            key={photo.id}
            style={
              index % 2 === 0
                ? appendixStyles.indexRow
                : appendixStyles.indexRowAlt
            }
          >
            <Text style={[appendixStyles.indexCell, { width: 25 }]}>
              {index + 1}
            </Text>
            <Text style={[appendixStyles.indexCell, { width: 80 }]}>
              {formatPhotoType(photo.photoType)}
            </Text>
            <Text style={[appendixStyles.indexCell, { flex: 1 }]}>
              {photo.caption || photo.filename || "No caption"}
            </Text>
            <Text style={[appendixStyles.indexCell, { width: 75 }]}>
              {photo.capturedAt
                ? new Date(photo.capturedAt).toLocaleDateString("en-NZ")
                : "—"}
            </Text>
            <Text style={[appendixStyles.indexCell, { width: 50 }]}>
              {photo.gpsLat && photo.gpsLng ? "Yes" : "No"}
            </Text>
          </View>
        ))}
      </View>

      {hasMore && (
        <Text style={appendixStyles.noPhotos}>
          Showing first 40 of {photos.length} photographs
        </Text>
      )}

      <Footer />
    </Page>
  );
}

// Single photo with full metadata
function PhotoItem({
  photo,
  index,
  fullWidth = false,
}: {
  photo: PhotoData;
  index: number;
  fullWidth?: boolean;
}) {
  return (
    <View
      style={fullWidth ? appendixStyles.photoContainerFull : appendixStyles.photoContainer}
    >
      {photo.url && (
        <Image
          src={photo.url}
          style={fullWidth ? appendixStyles.photoImageFull : appendixStyles.photoImage}
        />
      )}
      <View style={appendixStyles.photoMeta}>
        <Text style={appendixStyles.photoTypeBadge}>
          {formatPhotoType(photo.photoType)}
        </Text>
        <Text style={appendixStyles.photoNumber}>Photo {index + 1}</Text>
        {photo.caption && (
          <Text style={appendixStyles.photoCaption}>{photo.caption}</Text>
        )}
        <View style={appendixStyles.photoDetails}>
          <Text style={appendixStyles.photoDetail}>
            Captured: {formatDateTime(photo.capturedAt)}
          </Text>
          {photo.gpsLat && photo.gpsLng && (
            <Text style={appendixStyles.photoDetail}>
              GPS: {formatGPS(photo.gpsLat, photo.gpsLng)}
            </Text>
          )}
        </View>
        {photo.originalHash && (
          <Text style={[appendixStyles.photoDetail, { marginTop: 2 }]}>
            Hash: {photo.originalHash.substring(0, 24)}...
          </Text>
        )}
      </View>
    </View>
  );
}

// Photos page for a defect
function DefectPhotosPage({
  reportNumber,
  defect,
  photos,
  startIndex,
}: {
  reportNumber: string;
  defect: DefectData;
  photos: PhotoData[];
  startIndex: number;
}) {
  if (photos.length === 0) return null;

  return (
    <Page size="A4" style={appendixStyles.page}>
      <Header reportNumber={reportNumber} />

      <View style={appendixStyles.sectionHeader}>
        <Text style={appendixStyles.sectionTitle}>
          Defect #{defect.defectNumber}: {defect.title}
        </Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.charcoalLight, marginBottom: 15 }}>
        Location: {defect.location}
      </Text>

      <View style={appendixStyles.photoGrid}>
        {photos.slice(0, 4).map((photo, index) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            index={startIndex + index}
            fullWidth={photos.length === 1}
          />
        ))}
      </View>

      {photos.length > 4 && (
        <Text style={appendixStyles.noPhotos}>
          + {photos.length - 4} additional photographs for this defect
        </Text>
      )}

      <Footer />
    </Page>
  );
}

// Photos page for a roof element
function ElementPhotosPage({
  reportNumber,
  element,
  photos,
  startIndex,
}: {
  reportNumber: string;
  element: ElementData;
  photos: PhotoData[];
  startIndex: number;
}) {
  if (photos.length === 0) return null;

  return (
    <Page size="A4" style={appendixStyles.page}>
      <Header reportNumber={reportNumber} />

      <View style={appendixStyles.sectionHeader}>
        <Text style={appendixStyles.sectionTitle}>
          {element.elementType.replace(/_/g, " ")} - {element.location}
        </Text>
      </View>

      <View style={appendixStyles.photoGrid}>
        {photos.slice(0, 4).map((photo, index) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            index={startIndex + index}
            fullWidth={photos.length === 1}
          />
        ))}
      </View>

      {photos.length > 4 && (
        <Text style={appendixStyles.noPhotos}>
          + {photos.length - 4} additional photographs for this element
        </Text>
      )}

      <Footer />
    </Page>
  );
}

// General photos page
function GeneralPhotosPage({
  reportNumber,
  photos,
  startIndex,
  pageNumber,
}: {
  reportNumber: string;
  photos: PhotoData[];
  startIndex: number;
  pageNumber: number;
}) {
  return (
    <Page size="A4" style={appendixStyles.page}>
      <Header reportNumber={reportNumber} />

      {pageNumber === 1 && (
        <>
          <View style={appendixStyles.sectionHeader}>
            <Text style={appendixStyles.sectionTitle}>
              General Documentation Photos
            </Text>
          </View>
          <Text style={{ fontSize: 9, color: colors.charcoalLight, marginBottom: 15 }}>
            Overview, context, and general documentation photographs
          </Text>
        </>
      )}

      <View style={appendixStyles.photoGrid}>
        {photos.map((photo, index) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            index={startIndex + index}
          />
        ))}
      </View>

      <Footer />
    </Page>
  );
}

export function PhotoAppendix({
  reportNumber,
  photos,
  defects = [],
  elements = [],
}: PhotoAppendixProps) {
  if (photos.length === 0) {
    return (
      <Page size="A4" style={appendixStyles.page}>
        <Header reportNumber={reportNumber} />
        <Text style={appendixStyles.title}>Appendix C: Photo Appendix</Text>
        <Text style={appendixStyles.noPhotos}>
          No photographs were captured during this inspection.
        </Text>
        <Footer />
      </Page>
    );
  }

  const { defectPhotos, elementPhotos, generalPhotos } = groupPhotos(
    photos,
    defects,
    elements
  );

  const pages: React.ReactNode[] = [];
  let photoIndex = 0;

  // Photo Index Page
  pages.push(
    <PhotoIndexPage
      key="index"
      reportNumber={reportNumber}
      photos={photos}
    />
  );

  // Defect Photos
  defectPhotos.forEach(({ defect, photos: defectPhotoList }) => {
    if (defectPhotoList.length > 0) {
      pages.push(
        <DefectPhotosPage
          key={`defect-${defect.id}`}
          reportNumber={reportNumber}
          defect={defect}
          photos={defectPhotoList}
          startIndex={photoIndex}
        />
      );
      photoIndex += defectPhotoList.length;
    }
  });

  // Element Photos
  elementPhotos.forEach(({ element, photos: elementPhotoList }) => {
    if (elementPhotoList.length > 0) {
      pages.push(
        <ElementPhotosPage
          key={`element-${element.id}`}
          reportNumber={reportNumber}
          element={element}
          photos={elementPhotoList}
          startIndex={photoIndex}
        />
      );
      photoIndex += elementPhotoList.length;
    }
  });

  // General Photos (paginated, 4 per page)
  const generalPhotoPages = [];
  for (let i = 0; i < generalPhotos.length; i += 4) {
    generalPhotoPages.push(generalPhotos.slice(i, i + 4));
  }

  generalPhotoPages.forEach((pagePhotos, pageNum) => {
    pages.push(
      <GeneralPhotosPage
        key={`general-${pageNum}`}
        reportNumber={reportNumber}
        photos={pagePhotos}
        startIndex={photoIndex}
        pageNumber={pageNum + 1}
      />
    );
    photoIndex += pagePhotos.length;
  });

  return <>{pages}</>;
}

export default PhotoAppendix;
