import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDown, ArrowRight, Check, ChefHat, Clock3, Heart, Leaf, Minus, Plus, ShoppingBag, Sparkles, X } from 'lucide-react'
import './styles.css'

const API = '/api'
const euro = amount => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

function App() {
  const [desserts, setDesserts] = useState([])
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [ordering, setOrdering] = useState(false)

  useEffect(() => {
    fetch(`${API}/desserts`).then(response => {
      if (!response.ok) throw new Error('Impossible de charger les douceurs.')
      return response.json()
    }).then(setDesserts).catch(() => setError('La boutique est momentanément indisponible. Vérifiez que le serveur est bien lancé.')).finally(() => setLoading(false))
  }, [])

  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  const total = desserts.reduce((sum, dessert) => sum + dessert.price * (cart[dessert.id] || 0), 0)
  const update = (id, delta) => setCart(previous => {
    const next = { ...previous }
    const quantity = (next[id] || 0) + delta
    if (quantity <= 0) delete next[id]
    else next[id] = quantity
    return next
  })

  async function checkout() {
    setOrdering(true)
    setError('')
    try {
      const response = await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Object.entries(cart).map(([dessert_id, quantity]) => ({ dessert_id, quantity })) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'La commande n’a pas pu être enregistrée.')
      setConfirmation(data)
      setCart({})
    } catch (exception) {
      setError(exception.message || 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setOrdering(false)
    }
  }

  return <>
    <header className="topbar"><a className="brand" href="#accueil"><span className="brand-icon"><Sparkles size={18} /></span> douce heure<span className="brand-dot">.</span></a><nav><a href="#boutique">Nos douceurs</a><a href="#maison">Notre maison</a></nav><button className="cart-trigger" onClick={() => setCartOpen(true)} aria-label={`Ouvrir le panier, ${count} article${count > 1 ? 's' : ''}`}><ShoppingBag size={18} /><span>Mon panier</span><span className="cart-count">{count}</span></button></header>
    <main>
      <section className="hero" id="accueil"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> FABRIQUÉ AVEC AMOUR, À PARIS</span><h1>Un peu de<br />douceur dans<br />votre <em>journée.</em></h1><p>Des pâtisseries artisanales, des ingrédients choisis avec soin et une bonne raison de se faire plaisir.</p><a className="primary-button hero-button" href="#boutique">Découvrir nos douceurs <ArrowRight size={17} /></a><div className="hero-note"><div className="avatars"><span>👩🏻‍🍳</span><span>🧑🏽‍🍳</span><span>👨🏼‍🍳</span></div><span>Faites avec amour, chaque matin</span><Heart size={14} fill="currentColor" /></div></div><div className="hero-photo"><img src="https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=90" alt="Pâtisseries délicates préparées avec soin"/><div className="photo-sticker"><span>✳</span><strong>Une petite<br />pause bonheur</strong></div><span className="photo-caption">La douceur se partage.</span></div><a href="#boutique" className="scroll-cue" aria-label="Faire défiler"><ArrowDown size={18} /></a></section>
      <section className="trust-row" id="maison"><div><ChefHat /><span>Fait maison<br/><small>chaque jour</small></span></div><div><Leaf /><span>Ingrédients<br/><small>de saison</small></span></div><div><Heart /><span>Beaucoup<br/><small>d’amour</small></span></div><div><Clock3 /><span>Tout juste<br/><small>sorti du four</small></span></div></section>
      <section className="shop" id="boutique"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> DE LA VITRINE À CHEZ VOUS</span><h2>Nos petites <em>merveilles</em></h2></div><p>Une douceur pour soi, un assortiment à partager,<br/>ou juste parce qu’aujourd’hui est un bon jour.</p></div>{error && !desserts.length && <div className="error-banner">{error}</div>}{loading ? <div className="loading">On prépare nos douceurs…</div> : <div className="product-grid">{desserts.map((dessert, index) => <article className="product-card" key={dessert.id}><div className="product-photo"><img src={dessert.image} alt={dessert.name} loading={index > 2 ? 'lazy' : 'eager'} /><span className="category-tag">{dessert.category}</span><button className="quick-add" onClick={() => update(dessert.id, 1)} aria-label={`Ajouter ${dessert.name} au panier`}><Plus size={18}/></button></div><div className="product-info"><div><h3>{dessert.name}</h3><p>{dessert.description}</p></div><span className="price">{euro(dessert.price)}</span></div></article>)}</div>}</section>
      <section className="closing"><span>✳</span><p>La vie est trop courte<br/>pour dire non au <em>dessert.</em></p><span>✳</span></section>
    </main>
    <footer><a className="brand" href="#accueil"><span className="brand-icon"><Sparkles size={16}/></span> douce heure<span className="brand-dot">.</span></a><span>Fait avec amour et une petite pointe de vanille.</span><span>© Douce Heure 2025</span></footer>
    {cartOpen && <div className="overlay" onClick={event => event.target === event.currentTarget && setCartOpen(false)}><aside className="cart-panel"><div className="cart-header"><div><span className="eyebrow">VOTRE SÉLECTION</span><h2>Mon panier <span>({count})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Fermer le panier"><X/></button></div>{count === 0 ? <div className="empty-cart"><span>🍰</span><h3>Votre panier attend<br/>sa première douceur.</h3><p>Une petite merveille vous fait envie ?</p><button className="primary-button" onClick={() => { setCartOpen(false); document.querySelector('#boutique').scrollIntoView({ behavior: 'smooth' }) }}>Voir les douceurs <ArrowRight size={16}/></button></div> : <><div className="cart-items">{desserts.filter(dessert => cart[dessert.id]).map(dessert => <div className="cart-item" key={dessert.id}><img src={dessert.image} alt=""/><div className="cart-item-info"><h3>{dessert.name}</h3><span>{euro(dessert.price)}</span><div className="quantity-control"><button onClick={() => update(dessert.id, -1)} aria-label="Diminuer la quantité"><Minus size={13}/></button><span>{cart[dessert.id]}</span><button onClick={() => update(dessert.id, 1)} aria-label="Augmenter la quantité"><Plus size={13}/></button></div></div><strong>{euro(dessert.price * cart[dessert.id])}</strong></div>)}</div><div className="cart-footer"><div className="subtotal"><span>Total</span><strong>{euro(total)}</strong></div><p>Commande fictive — aucun paiement ne sera demandé.</p>{error && <div className="order-error">{error}</div>}<button className="primary-button checkout-button" disabled={ordering} onClick={checkout}>{ordering ? 'Enregistrement…' : 'Commander'} <ArrowRight size={17}/></button></div></>}</aside></div>}
    {confirmation && <div className="success-overlay"><div className="success-card"><button className="icon-button success-close" onClick={() => { setConfirmation(null); setCartOpen(false) }} aria-label="Fermer"><X/></button><div className="success-icon"><Check size={30}/></div><span className="eyebrow">C’EST DANS LA POCHE !</span><h2>Merci pour<br/><em>votre commande.</em></h2><p>{confirmation.message}</p><div className="order-summary"><span>Commande n°{confirmation.id}</span><strong>{euro(confirmation.total)}</strong></div><button className="primary-button" onClick={() => { setConfirmation(null); setCartOpen(false) }}>Continuer la gourmandise <ArrowRight size={16}/></button></div></div>}
  </>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
