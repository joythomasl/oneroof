import { useEffect } from 'react';
import Header from './components/Header';
import StatusStrip from './components/StatusStrip';
import Panel from './components/Panel';
import Toast from './components/Toast';
import SvgMap from './components/map/SvgMap';
import CpocModal from './components/modals/CpocModal';
import ChannelChooser from './components/modals/ChannelChooser';
import GalleryModal from './components/modals/GalleryModal';
import Lightbox from './components/modals/Lightbox';
import { useUIStore } from './stores/uiStore';

export default function App() {
  const {
    panelCollapsed,
    setAcctMenuOpen,
    setDistrictPopOpen,
    closeCpocModal,
    closeChanModal,
    closeGallery,
    closeLightbox,
    lightboxIdx,
    photoSet,
    openLightbox,
    cpocModalArea,
    chanModalArea,
    galModalArea,
  } = useUIStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lightboxIdx !== null) return closeLightbox();
        if (chanModalArea) return closeChanModal();
        if (galModalArea) return closeGallery();
        if (cpocModalArea) return closeCpocModal();
        setAcctMenuOpen(false);
        setDistrictPopOpen(false);
      }
      if (lightboxIdx !== null && photoSet.length > 1 && event.key === 'ArrowLeft') {
        openLightbox((lightboxIdx - 1 + photoSet.length) % photoSet.length);
      }
      if (lightboxIdx !== null && photoSet.length > 1 && event.key === 'ArrowRight') {
        openLightbox((lightboxIdx + 1) % photoSet.length);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [chanModalArea, closeChanModal, closeCpocModal, closeGallery, closeLightbox, cpocModalArea, galModalArea, lightboxIdx, openLightbox, photoSet.length, setAcctMenuOpen, setDistrictPopOpen]);

  return (
    <div
      className="app"
      onClick={() => {
        setAcctMenuOpen(false);
        setDistrictPopOpen(false);
      }}
    >
      <Header />
      <StatusStrip />
      <main className={`main${panelCollapsed ? ' collapsed' : ''}`}>
        <SvgMap />
        <Panel />
      </main>

      <CpocModal />
      <ChannelChooser />
      <GalleryModal />
      <Lightbox />
      <Toast />
    </div>
  );
}
