import React, { useState, useEffect } from 'react';
import { foodApi } from '../services/api';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const categories = [
  { id: 'ALL', label: 'All Concessions' },
  { id: 'SNACKS', label: 'Popcorn & Snacks' },
  { id: 'HOT_FOOD', label: 'Hot Meals' },
  { id: 'COMBOS', label: 'Value Combos' },
  { id: 'BEVERAGES', label: 'Cold Drinks' },
  { id: 'DESSERTS', label: 'Sweets & Ice Cream' },
];

const FoodMenuPage = () => {
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const loadMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await foodApi.getItems({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      });
      setItems(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load food menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [selectedCategory]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.id === item._id || line.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          id: item._id || item.id,
          foodItemId: item._id || item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
    toast.success(`Added ${item.name} to cart.`);
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.id === id) {
            const newQ = line.quantity + delta;
            return newQ > 0 ? { ...line, quantity: newQ } : null;
          }
          return line;
        })
        .filter(Boolean)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = parseFloat((subtotal * 0.08875).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.warning('Your concessions cart is empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        theatreId: 'th101',
        items: cart.map((line) => ({
          foodItemId: line.foodItemId,
          name: line.name,
          price: line.price,
          quantity: line.quantity,
        })),
        notes: 'Pre-ordered via web app for express auditorium entry',
      };

      const res = await foodApi.createOrder(payload);
      setConfirmedOrder(res.data);
      setCart([]);
      toast.success('Food pre-order confirmed! Pickup at Express Counter 1.');
    } catch (err) {
      toast.error(err.message || 'Could not place food order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header Banner */}
      <div className="bg-white border rounded p-4 mb-4 shadow-sm">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary text-white">Express Concessions</span>
              <span className="text-muted small">Skip the lobby lines</span>
            </div>
            <h1 className="h4 fw-bold text-dark mb-1">Cinema Gourmet Food & Drinks</h1>
            <p className="text-secondary small mb-0">
              Pre-order fresh hot popcorn, chef-crafted nachos, artisan desserts, and fountain beverages ready for immediate pickup.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 text-secondary small bg-light p-2.5 rounded border">
            <i className="bi bi-geo-alt-fill text-primary fs-5" />
            <div>
              <strong className="d-block text-dark">Express Concessions Counter 1</strong>
              <span>Show your digital order code at pickup</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`btn btn-sm ${
              selectedCategory === cat.id ? 'btn-primary' : 'btn-white border text-secondary'
            }`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && <ErrorAlert message={error} onRetry={loadMenu} className="mb-4" />}

      <div className="row g-4">
        {/* Menu Items Grid */}
        <div className="col-lg-8">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading concessions menu...</span>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {items.map((item) => {
                const inCartItem = cart.find((c) => c.id === (item._id || item.id));
                return (
                  <div className="col-md-6" key={item._id || item.id}>
                    <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex flex-column justify-content-between">
                      <div>
                        {item.imageUrl && (
                          <div
                            className="rounded mb-3 overflow-hidden bg-light"
                            style={{ height: '140px' }}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-100 h-100 object-fit-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <h2 className="h6 fw-bold text-dark mb-0">{item.name}</h2>
                          <span className="fw-bold text-primary fs-6">
                            ${Number(item.price).toFixed(2)}
                          </span>
                        </div>

                        <p className="text-secondary small mb-2" style={{ fontSize: '0.8rem' }}>
                          {item.description}
                        </p>

                        <div className="d-flex flex-wrap gap-1 mb-3">
                          {item.calories > 0 && (
                            <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                              {item.calories} kcal
                            </span>
                          )}
                          {(item.allergens || []).map((allergen) => (
                            <span
                              key={allergen}
                              className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                              style={{ fontSize: '0.65rem' }}
                            >
                              {allergen}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                        {inCartItem ? (
                          <div className="d-flex align-items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary py-0 px-2"
                              onClick={() => updateQuantity(inCartItem.id, -1)}
                            >
                              -
                            </button>
                            <span className="fw-bold small">{inCartItem.quantity}</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary py-0 px-2"
                              onClick={() => updateQuantity(inCartItem.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="small text-muted">Ready to add</span>
                        )}

                        <Button
                          variant={inCartItem ? 'outline-primary' : 'primary'}
                          size="sm"
                          onClick={() => addToCart(item)}
                        >
                          <i className="bi bi-cart-plus me-1" />
                          {inCartItem ? 'Add More' : 'Add to Order'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Cart Order Summary */}
        <div className="col-lg-4">
          <div className="bg-white border rounded p-4 shadow-sm sticky-top" style={{ top: '80px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h2 className="h6 fw-bold text-dark mb-0">Your Refreshment Order</h2>
              <span className="badge bg-primary text-white">{cart.length} items</span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                <i className="bi bi-cup-straw display-4 text-secondary d-block mb-2 opacity-50" />
                Select items from the concessions menu to pre-order and skip the line.
              </div>
            ) : (
              <>
                <div className="d-flex flex-column gap-2 mb-3 pb-3 border-bottom overflow-auto" style={{ maxHeight: '220px' }}>
                  {cart.map((line) => (
                    <div key={line.id} className="d-flex justify-content-between align-items-center small">
                      <div>
                        <div className="fw-semibold text-dark">{line.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          ${line.price.toFixed(2)} × {line.quantity}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark">
                          ${(line.price * line.quantity).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => updateQuantity(line.id, -line.quantity)}
                          title="Remove item"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="d-flex flex-column gap-1 mb-3 pb-3 border-bottom small">
                  <div className="d-flex justify-content-between text-secondary">
                    <span>Subtotal:</span>
                    <span className="fw-semibold text-dark">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary">
                    <span>Estimated Tax (8.875%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center fs-6 fw-bold border-top pt-2 mt-1">
                    <span className="text-dark">Total:</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-100 py-2"
                  loading={isSubmitting}
                  onClick={handleCheckout}
                >
                  <i className="bi bi-bag-check-fill me-1" />
                  Place Pre-Order (${total.toFixed(2)})
                </Button>

                <div className="text-center text-muted small mt-2" style={{ fontSize: '0.75rem' }}>
                  <i className="bi bi-clock me-1" />
                  Ready at Express Counter 1 upon cinema arrival
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {confirmedOrder && (
        <Modal
          isOpen={!!confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
          title="Food Pre-Order Confirmed!"
          primaryActionLabel="Done"
          onPrimaryAction={() => setConfirmedOrder(null)}
        >
          <div className="text-center p-3 bg-light border rounded mb-3">
            <div
              className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
              style={{ width: '56px', height: '56px' }}
            >
              <i className="bi bi-check-lg fs-2" />
            </div>
            <h3 className="h6 fw-bold text-dark mb-1">Order #{confirmedOrder.orderNumber}</h3>
            <div className="text-secondary small mb-3">
              Total Paid: <strong>${confirmedOrder.totalAmount?.toFixed(2)}</strong> (dev_mock)
            </div>

            <div className="p-3 bg-white border rounded text-start small mb-3">
              <strong className="d-block text-dark mb-1">
                <i className="bi bi-geo-alt-fill text-primary me-1" />
                Pickup Location:
              </strong>
              <div className="text-primary fw-bold mb-2">{confirmedOrder.pickupCounter}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Present this order number to the staff at the express counter to receive your freshly prepared items.
              </div>
            </div>

            <div className="list-group list-group-flush border rounded text-start small">
              {(confirmedOrder.items || []).map((item, idx) => (
                <div key={idx} className="list-group-item d-flex justify-content-between py-1.5">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span className="fw-semibold">${item.subtotal?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FoodMenuPage;

